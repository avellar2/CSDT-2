import { describe, expect, it } from "vitest";
import {
  buildStatsPayload,
  computeAllDistributions,
  computeQuestionDistribution,
  type FeedbackAnswerRow,
} from "@/utils/feedback/stats";
import { FEEDBACK_QUESTIONNAIRE } from "@/utils/feedback/questionnaire";

const answer = (
  questionKey: string,
  kind: FeedbackAnswerRow["kind"],
  optionKeys: string[] = [],
  optionLabels: string[] = [],
  extra?: Partial<FeedbackAnswerRow>,
): FeedbackAnswerRow => ({
  questionKey,
  kind,
  optionKeys,
  optionLabels,
  textValue: null,
  otherText: null,
  ...extra,
});

describe("Estatísticas da pesquisa", () => {
  it("calcula distribuição de seleção única com percentual sobre respondentes", () => {
    const question = FEEDBACK_QUESTIONNAIRE.questions[0];
    const answers = [
      answer("q1", "SINGLE", ["excelente"], ["Excelente."]),
      answer("q1", "SINGLE", ["excelente"], ["Excelente."]),
      answer("q1", "SINGLE", ["bom"], ["Bom."]),
      answer("q1", "SINGLE", ["ruim"], ["Ruim."]),
    ];

    const distribution = computeQuestionDistribution(answers, question, 4);
    expect(distribution.answeredCount).toBe(4);
    expect(distribution.buckets.find((bucket) => bucket.key === "excelente")).toEqual({
      key: "excelente",
      label: "Excelente.",
      count: 2,
      percent: 50,
    });
    expect(distribution.buckets.find((bucket) => bucket.key === "regular")?.count).toBe(0);
  });

  it("em múltipla seleção, percentual é sobre respondentes e pode passar de 100 no total", () => {
    const question = FEEDBACK_QUESTIONNAIRE.questions[6];
    const answers = [
      answer("q7", "MULTI", ["outros"], ["Outros."], { otherText: "Tablets" }),
      answer("q7", "MULTI", ["outros", "impressoras"], ["Outros.", "Atendimento e suporte a impressoras."]),
    ];
    const distribution = computeQuestionDistribution(answers, question, 2);
    expect(distribution.answeredCount).toBe(2);
    expect(distribution.buckets.find((bucket) => bucket.key === "outros")?.percent).toBe(100);
    expect(distribution.otherTexts).toEqual(["Tablets"]);
  });

  it("mantém a pergunta 10 por faixas, sem média numérica", () => {
    const question = FEEDBACK_QUESTIONNAIRE.questions[9];
    const answers = [
      answer("q10", "SINGLE", ["9-10"], ["9 a 10 – Excelente."]),
      answer("q10", "SINGLE", ["9-10"], ["9 a 10 – Excelente."]),
      answer("q10", "SINGLE", ["0-2"], ["0 a 2 – Muito ruim."]),
    ];
    const distribution = computeQuestionDistribution(answers, question, 3);
    expect(distribution.buckets.map((bucket) => bucket.label)).toEqual([
      "0 a 2 – Muito ruim.",
      "3 a 4 – Ruim.",
      "5 a 6 – Regular.",
      "7 a 8 – Bom.",
      "9 a 10 – Excelente.",
    ]);
    expect(distribution.buckets.find((bucket) => bucket.key === "9-10")?.percent).toBe(66.7);
    // Nenhum campo de média é exposto.
    expect(Object.keys(distribution)).not.toContain("average");
    expect(Object.keys(distribution)).not.toContain("nps");
  });

  it("preserva distribuição neutra, inclusive avaliações negativas", () => {
    const question = FEEDBACK_QUESTIONNAIRE.questions[14];
    const answers = [
      answer("q15", "SINGLE", ["ruim"], [
        "Ruim – Precisa melhorar o relacionamento e o atendimento.",
      ]),
    ];
    const distribution = computeQuestionDistribution(answers, question, 1);
    expect(
      distribution.buckets.find((bucket) => bucket.key === "ruim")?.count,
    ).toBe(1);
  });

  it("agrega respostas abertas em comentários", () => {
    const payload = buildStatsPayload({
      responses: [
        {
          id: 1,
          answers: [
            answer("q14", "OPEN", [], [], { textValue: "Ótimo atendimento" }),
            answer("q16", "OPEN", [], [], { textValue: "Mais visitas" }),
            answer("q1", "SINGLE", ["bom"], ["Bom."]),
          ],
        },
      ],
    });
    expect(payload.totalResponses).toBe(1);
    expect(payload.comments.q14).toEqual(["Ótimo atendimento"]);
    expect(payload.comments.q16).toEqual(["Mais visitas"]);
    expect(payload.note).toContain("faixas");
    expect(payload.note).toContain("não há média numérica");
  });

  it("retorna uma distribuição para cada uma das 16 perguntas", () => {
    const distributions = computeAllDistributions([], 0);
    expect(distributions).toHaveLength(16);
    expect(distributions.map((distribution) => distribution.number)).toEqual(
      Array.from({ length: 16 }, (_, index) => index + 1),
    );
    for (const distribution of distributions) {
      for (const bucket of distribution.buckets) {
        expect(bucket.percent).toBe(0);
      }
    }
  });
});
