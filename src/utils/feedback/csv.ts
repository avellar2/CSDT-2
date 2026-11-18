import { FEEDBACK_QUESTIONNAIRE } from "./questionnaire";

export interface ExportResponseRow {
  campaignName: string;
  schoolName: string;
  district: string | null;
  sentAt: Date | null;
  submittedAt: Date;
  respondentName: string;
  respondentRegistration: string;
  respondentRole: string;
  answers: Array<{
    questionKey: string;
    optionLabels: string[];
    textValue: string | null;
    otherText: string | null;
  }>;
}

/** Escapa uma célula CSV e neutraliza fórmulas de planilha. */
export function csvEscape(value: unknown): string {
  let text = value === null || value === undefined ? "" : String(value);
  // Previne injeção de fórmula em Excel/LibreOffice.
  if (/^[=+\-@\t\r]/.test(text)) {
    text = `'${text}`;
  }
  if (/["\n\r;,]/.test(text)) {
    text = `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

export function formatDateTimeBr(value: Date | null): string {
  if (!value) return "";
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function answerCell(
  row: ExportResponseRow,
  questionKey: string,
): string {
  const answer = row.answers.find((entry) => entry.questionKey === questionKey);
  if (!answer) return "";
  if (answer.textValue) return answer.textValue;
  const labels = [...answer.optionLabels];
  if (answer.otherText) {
    labels.push(`Outros: ${answer.otherText}`);
  }
  return labels.join(" | ");
}

export function buildResponsesCsv(rows: ExportResponseRow[]): string {
  const header = [
    "Campanha",
    "Unidade escolar",
    "Distrito",
    "Enviado em",
    "Respondido em",
    "Nome completo",
    "Matrícula funcional",
    "Função/cargo",
    ...FEEDBACK_QUESTIONNAIRE.questions.map(
      (question) => `P${question.number} - ${question.title}`,
    ),
  ];

  const lines = rows.map((row) =>
    [
      row.campaignName,
      row.schoolName,
      row.district ?? "",
      formatDateTimeBr(row.sentAt),
      formatDateTimeBr(row.submittedAt),
      row.respondentName,
      row.respondentRegistration,
      row.respondentRole,
      ...FEEDBACK_QUESTIONNAIRE.questions.map((question) =>
        answerCell(row, question.key),
      ),
    ]
      .map(csvEscape)
      .join(";"),
  );

  // BOM para o Excel reconhecer UTF-8 corretamente.
  return `﻿${[header.map(csvEscape).join(";"), ...lines].join("\r\n")}\r\n`;
}
