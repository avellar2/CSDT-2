import { describe, expect, it } from "vitest";
import { buildResponsesCsv, csvEscape, type ExportResponseRow } from "@/utils/feedback/csv";
import { FEEDBACK_QUESTIONNAIRE } from "@/utils/feedback/questionnaire";

const row: ExportResponseRow = {
  campaignName: "Campanha 2026",
  schoolName: "EM Teste",
  district: "Centro",
  sentAt: new Date("2026-11-01T12:00:00.000Z"),
  submittedAt: new Date("2026-11-02T12:30:00.000Z"),
  respondentName: "Maria da Silva",
  respondentRegistration: "000123",
  respondentRole: "Diretora",
  answers: [
    {
      questionKey: "q1",
      optionLabels: ["Excelente."],
      textValue: null,
      otherText: null,
    },
    {
      questionKey: "q7",
      optionLabels: ["Outros."],
      textValue: null,
      otherText: "Tablets",
    },
    {
      questionKey: "q14",
      optionLabels: [],
      textValue: "Sugestão: melhorar o agendamento",
      otherText: null,
    },
  ],
};

describe("Exportação CSV", () => {
  it("começa com BOM UTF-8 para o Excel", () => {
    const csv = buildResponsesCsv([row]);
    expect(csv.charCodeAt(0)).toBe(0xfeff);
  });

  it("inclui as 16 colunas de perguntas e os dados do responsável", () => {
    const csv = buildResponsesCsv([row]);
    const header = csv.split("\r\n")[0];
    expect(header).toContain("Matrícula funcional");
    expect(header).toContain("Função/cargo");
    expect(header).toContain("P1 - Como você avalia o atendimento prestado pelo CSDT?");
    expect(header).toContain("P16 -");
    expect(header.split(";")).toHaveLength(8 + FEEDBACK_QUESTIONNAIRE.questions.length);
  });

  it("serializa respostas e complemento de Outros", () => {
    const csv = buildResponsesCsv([row]);
    expect(csv).toContain("Excelente.");
    expect(csv).toContain("Outros: Tablets");
    expect(csv).toContain("Sugestão: melhorar o agendamento");
    expect(csv).toContain("000123");
  });

  it("neutraliza injeção de fórmula em planilhas", () => {
    expect(csvEscape("=HYPERLINK(\"http://evil\")")).toBe(
      '"\'=HYPERLINK(""http://evil"")"',
    );
    expect(csvEscape("+55 21 99999-9999").startsWith("'")).toBe(true);
    expect(csvEscape("-1").startsWith("'")).toBe(true);
    expect(csvEscape("@SUM(A1)").startsWith("'")).toBe(true);
  });

  it("escapa aspas, ponto e vírgula e quebras de linha", () => {
    expect(csvEscape('a;b')).toBe('"a;b"');
    expect(csvEscape('diz "oi"')).toBe('"diz ""oi"""');
    expect(csvEscape("linha1\nlinha2")).toBe('"linha1\nlinha2"');
    expect(csvEscape(null)).toBe("");
  });
});
