import {
  FEEDBACK_QUESTIONNAIRE,
  isChoiceQuestion,
  type FeedbackQuestion,
} from "./questionnaire";

export interface FeedbackAnswerRow {
  questionKey: string;
  kind: "SINGLE" | "MULTI" | "OPEN";
  optionKeys: string[];
  optionLabels: string[];
  textValue: string | null;
  otherText: string | null;
}

export interface DistributionBucket {
  key: string;
  label: string;
  count: number;
  percent: number;
}

export interface QuestionDistribution {
  questionKey: string;
  number: number;
  title: string;
  kind: "SINGLE" | "MULTI" | "OPEN";
  answeredCount: number;
  buckets: DistributionBucket[];
  /** Notas textuais extras informadas em "Outros". */
  otherTexts: string[];
}

function percent(count: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((count / total) * 1000) / 10;
}

/**
 * Distribuição de uma pergunta de escolha. Em múltipla seleção, o percentual é
 * calculado sobre o número de respondentes (não sobre o total de marcações),
 * de modo que os percentuais não somam 100% — o que é correto.
 */
export function computeQuestionDistribution(
  answers: FeedbackAnswerRow[],
  question: FeedbackQuestion,
  respondentCount: number,
): QuestionDistribution {
  if (!isChoiceQuestion(question)) {
    const texts = answers
      .map((answer) => answer.textValue)
      .filter((value): value is string => Boolean(value && value.trim()));
    return {
      questionKey: question.key,
      number: question.number,
      title: question.title,
      kind: "OPEN",
      answeredCount: texts.length,
      buckets: [],
      otherTexts: texts,
    };
  }

  const counts = new Map<string, number>();
  const otherTexts: string[] = [];
  let answeredCount = 0;

  for (const answer of answers) {
    if (answer.optionKeys.length > 0) answeredCount += 1;
    for (const key of answer.optionKeys) {
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    if (answer.otherText && answer.otherText.trim()) {
      otherTexts.push(answer.otherText.trim());
    }
  }

  const denominator = question.kind === "SINGLE" ? answeredCount : respondentCount;

  return {
    questionKey: question.key,
    number: question.number,
    title: question.title,
    kind: question.kind,
    answeredCount,
    buckets: question.options.map((option) => ({
      key: option.key,
      label: option.label,
      count: counts.get(option.key) ?? 0,
      percent: percent(counts.get(option.key) ?? 0, denominator),
    })),
    otherTexts,
  };
}

export function computeAllDistributions(
  answers: FeedbackAnswerRow[],
  respondentCount: number,
): QuestionDistribution[] {
  return FEEDBACK_QUESTIONNAIRE.questions.map((question) =>
    computeQuestionDistribution(
      answers.filter((answer) => answer.questionKey === question.key),
      question,
      respondentCount,
    ),
  );
}

export interface FeedbackStatsSummary {
  totalResponses: number;
  totalCampaigns: number;
  answersByQuestion: Record<string, FeedbackAnswerRow[]>;
}

/**
 * Agrega as respostas em estruturas prontas para os gráficos do painel.
 * Não calcula média numérica da pergunta 10: a escala original é por faixas.
 */
export function buildStatsPayload(input: {
  responses: Array<{ id: number; answers: FeedbackAnswerRow[] }>;
}) {
  const total = input.responses.length;
  const allAnswers = input.responses.flatMap((response) => response.answers);

  return {
    totalResponses: total,
    note:
      "A pergunta 10 utiliza faixas de nota. Os resultados são exibidos por faixa; não há média numérica nem NPS.",
    questions: computeAllDistributions(allAnswers, total),
    comments: {
      q14: allAnswers
        .filter((answer) => answer.questionKey === "q14" && answer.textValue)
        .map((answer) => answer.textValue as string),
      q16: allAnswers
        .filter((answer) => answer.questionKey === "q16" && answer.textValue)
        .map((answer) => answer.textValue as string),
    },
  };
}
