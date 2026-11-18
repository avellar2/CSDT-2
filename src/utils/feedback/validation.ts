import {
  FEEDBACK_QUESTIONNAIRE,
  findByOptionKey,
  isChoiceQuestion,
  type FeedbackChoiceQuestion,
  type FeedbackOpenQuestion,
} from "./questionnaire";
import {
  FEEDBACK_MAX_NAME_LENGTH,
  FEEDBACK_MAX_OTHER_LENGTH,
  FEEDBACK_MAX_REGISTRATION_LENGTH,
  FEEDBACK_MAX_ROLE_LENGTH,
} from "./config";

export interface SubmittedAnswer {
  optionKeys?: unknown;
  text?: unknown;
  otherText?: unknown;
}

export interface FeedbackSubmissionPayload {
  answers?: unknown;
  respondent?: unknown;
}

export interface RespondentInput {
  name: string;
  registration: string;
  role: string;
}

export interface NormalizedAnswer {
  questionKey: string;
  kind: "SINGLE" | "MULTI" | "OPEN";
  optionKeys: string[];
  optionLabels: string[];
  textValue: string | null;
  otherText: string | null;
}

export type ValidationResult =
  | { ok: true; answers: NormalizedAnswer[]; respondent: RespondentInput }
  | { ok: false; errors: string[] };

/**
 * Remove caracteres de controle, normaliza espaços e limita o tamanho.
 * Não remove acentos nem pontuação: o texto é preservado como o usuário digitou.
 */
export function sanitizeText(value: unknown, maxLength: number): string {
  if (typeof value !== "string") return "";
  // eslint-disable-next-line no-control-regex
  const withoutControl = value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "");
  return withoutControl.trim().slice(0, maxLength);
}

function normalizeOptionKeys(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  for (const item of value) {
    if (typeof item === "string" && !seen.has(item)) seen.add(item);
  }
  return Array.from(seen);
}

function validateRespondent(raw: unknown, errors: string[]): RespondentInput {
  const source =
    raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};

  const name = sanitizeText(source.name, FEEDBACK_MAX_NAME_LENGTH);
  const registration = sanitizeText(
    source.registration,
    FEEDBACK_MAX_REGISTRATION_LENGTH,
  );
  const role = sanitizeText(source.role, FEEDBACK_MAX_ROLE_LENGTH);

  if (!name) errors.push("Informe o nome completo do responsável.");
  if (!registration) errors.push("Informe a matrícula funcional do responsável.");
  if (!role) errors.push("Informe a função/cargo do responsável.");

  return { name, registration, role };
}

function validateChoiceQuestion(
  question: FeedbackChoiceQuestion,
  raw: SubmittedAnswer,
  errors: string[],
): NormalizedAnswer {
  const selected = normalizeOptionKeys(raw.optionKeys);

  if (question.kind === "SINGLE" && selected.length > 1) {
    errors.push(`A pergunta ${question.number} aceita apenas uma alternativa.`);
  }

  if (question.required && selected.length === 0) {
    errors.push(`Responda a pergunta ${question.number}.`);
  }

  const optionKeys: string[] = [];
  const optionLabels: string[] = [];

  for (const key of selected) {
    const option = findByOptionKey(question, key);
    if (!option) {
      errors.push(`Alternativa inválida na pergunta ${question.number}.`);
      continue;
    }
    optionKeys.push(option.key);
    optionLabels.push(option.label);
  }

  let otherText: string | null = null;
  if (question.allowsOther && optionKeys.includes("outros")) {
    otherText = sanitizeText(raw.otherText, FEEDBACK_MAX_OTHER_LENGTH) || null;
  }

  return {
    questionKey: question.key,
    kind: question.kind,
    optionKeys,
    optionLabels,
    textValue: null,
    otherText,
  };
}

function validateOpenQuestion(
  question: FeedbackOpenQuestion,
  raw: SubmittedAnswer,
  errors: string[],
): NormalizedAnswer {
  const text = sanitizeText(raw.text, question.maxLength);

  if (question.required && !text) {
    errors.push(`Responda a pergunta ${question.number}.`);
  }

  return {
    questionKey: question.key,
    kind: "OPEN",
    optionKeys: [],
    optionLabels: [],
    textValue: text || null,
    otherText: null,
  };
}

/**
 * Validação server-side completa. O frontend replica as mesmas regras, mas
 * esta é a fonte de verdade: nenhuma resposta é gravada sem passar aqui.
 */
export function validateFeedbackSubmission(
  payload: FeedbackSubmissionPayload,
): ValidationResult {
  const errors: string[] = [];

  if (!payload || typeof payload !== "object") {
    return { ok: false, errors: ["Payload inválido."] };
  }

  const answersSource =
    payload.answers && typeof payload.answers === "object"
      ? (payload.answers as Record<string, unknown>)
      : {};

  const respondent = validateRespondent(payload.respondent, errors);
  const answers: NormalizedAnswer[] = [];

  for (const question of FEEDBACK_QUESTIONNAIRE.questions) {
    const rawValue = answersSource[question.key];
    const raw: SubmittedAnswer =
      rawValue && typeof rawValue === "object"
        ? (rawValue as SubmittedAnswer)
        : {};

    if (isChoiceQuestion(question)) {
      answers.push(validateChoiceQuestion(question, raw, errors));
    } else {
      answers.push(validateOpenQuestion(question, raw, errors));
    }
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  return { ok: true, answers, respondent };
}

/** Percentual de perguntas obrigatórias já respondidas (para o progresso). */
export function feedbackCompletionRatio(
  answers: Record<string, SubmittedAnswer | undefined>,
): number {
  const required = FEEDBACK_QUESTIONNAIRE.questions.filter((q) => q.required);
  if (required.length === 0) return 100;
  let done = 0;
  for (const question of required) {
    const raw = answers[question.key];
    if (!raw) continue;
    if (question.kind === "OPEN") {
      if (sanitizeText(raw.text, 10).length > 0) done += 1;
    } else if (normalizeOptionKeys(raw.optionKeys).length > 0) {
      done += 1;
    }
  }
  return Math.round((done / required.length) * 100);
}
