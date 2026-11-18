import { describe, expect, it } from "vitest";
import {
  feedbackCompletionRatio,
  sanitizeText,
  validateFeedbackSubmission,
} from "@/utils/feedback/validation";
import { FEEDBACK_QUESTIONNAIRE } from "@/utils/feedback/questionnaire";

function validPayload() {
  const answers: Record<string, unknown> = {};
  for (const question of FEEDBACK_QUESTIONNAIRE.questions) {
    if (question.kind === "OPEN") {
      answers[question.key] = { text: "" };
    } else if (question.kind === "MULTI") {
      answers[question.key] = { optionKeys: [question.options[0].key] };
    } else {
      answers[question.key] = { optionKeys: [question.options[0].key] };
    }
  }
  return {
    answers,
    respondent: {
      name: "Maria da Silva",
      registration: "0012345",
      role: "Diretora",
    },
  };
}

describe("Validação da resposta da pesquisa", () => {
  it("aceita um questionário completo", () => {
    const result = validateFeedbackSubmission(validPayload());
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.answers).toHaveLength(16);
    expect(result.respondent).toEqual({
      name: "Maria da Silva",
      registration: "0012345",
      role: "Diretora",
    });
  });

  it("preserva zeros à esquerda da matrícula como texto", () => {
    const payload = validPayload();
    payload.respondent.registration = "000123";
    const result = validateFeedbackSubmission(payload);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.respondent.registration).toBe("000123");
  });

  it("exige nome, matrícula e função do responsável", () => {
    const payload = validPayload();
    payload.respondent = { name: "  ", registration: "", role: "" };
    const result = validateFeedbackSubmission(payload);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.join(" ")).toContain("nome completo");
      expect(result.errors.join(" ")).toContain("matrícula funcional");
      expect(result.errors.join(" ")).toContain("função/cargo");
    }
  });

  it("exige todas as perguntas obrigatórias", () => {
    const payload = validPayload();
    payload.answers = {};
    const result = validateFeedbackSubmission(payload);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      // 14 perguntas obrigatórias (q14 e q16 são opcionais)
      const questionErrors = result.errors.filter((error) =>
        error.startsWith("Responda a pergunta"),
      );
      expect(questionErrors).toHaveLength(14);
    }
  });

  it("rejeita alternativa inexistente", () => {
    const payload = validPayload();
    (payload.answers as Record<string, { optionKeys: string[] }>).q1 = {
      optionKeys: ["opcao-inexistente"],
    };
    const result = validateFeedbackSubmission(payload);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.join(" ")).toContain("Alternativa inválida na pergunta 1");
    }
  });

  it("rejeita duas alternativas em pergunta de seleção única", () => {
    const payload = validPayload();
    const q1 = FEEDBACK_QUESTIONNAIRE.questions[0];
    if (q1.kind === "OPEN") throw new Error("q1 deveria ser de escolha");
    (payload.answers as Record<string, { optionKeys: string[] }>).q1 = {
      optionKeys: [q1.options[0].key, q1.options[1].key],
    };
    const result = validateFeedbackSubmission(payload);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.join(" ")).toContain("aceita apenas uma alternativa");
    }
  });

  it("aceita múltipla seleção e guarda os rótulos oficiais", () => {
    const payload = validPayload();
    const q7 = FEEDBACK_QUESTIONNAIRE.questions[6];
    if (q7.kind === "OPEN") throw new Error("q7 deveria ser de escolha");
    (payload.answers as Record<string, unknown>).q7 = {
      optionKeys: [q7.options[0].key, q7.options[2].key],
    };
    const result = validateFeedbackSubmission(payload);
    expect(result.ok).toBe(true);
    if (result.ok) {
      const answer = result.answers.find((entry) => entry.questionKey === "q7");
      expect(answer?.optionLabels).toEqual([
        "Suporte técnico em computadores.",
        "Atendimento e suporte a impressoras.",
      ]);
    }
  });

  it("guarda complemento de Outros somente quando Outros está marcado", () => {
    const payload = validPayload();
    (payload.answers as Record<string, unknown>).q9 = {
      optionKeys: ["outros"],
      otherText: "Melhorar o agendamento",
    };
    const result = validateFeedbackSubmission(payload);
    expect(result.ok).toBe(true);
    if (result.ok) {
      const withOther = result.answers.find((entry) => entry.questionKey === "q9");
      expect(withOther?.otherText).toBe("Melhorar o agendamento");
    }

    const otherPayload = validPayload();
    (otherPayload.answers as Record<string, unknown>).q9 = {
      optionKeys: ["reduzir-tempo"],
      otherText: "Texto que deve ser descartado",
    };
    const second = validateFeedbackSubmission(otherPayload);
    expect(second.ok).toBe(true);
    if (second.ok) {
      const withoutOther = second.answers.find((entry) => entry.questionKey === "q9");
      expect(withoutOther?.otherText).toBeNull();
    }
  });

  it("limita o tamanho de respostas abertas sem quebrar caracteres acentuados", () => {
    const payload = validPayload();
    (payload.answers as Record<string, unknown>).q14 = {
      text: "a".repeat(5000) + " ção",
    };
    const result = validateFeedbackSubmission(payload);
    expect(result.ok).toBe(true);
    if (result.ok) {
      const answer = result.answers.find((entry) => entry.questionKey === "q14");
      expect(answer?.textValue?.length).toBe(2000);
    }
  });

  it("sanitiza caracteres de controle e espaços", () => {
    expect(sanitizeText("  texto\u0000 com \u0007controle  ", 100)).toBe(
      "texto com controle",
    );
    expect(sanitizeText(123 as unknown, 100)).toBe("");
    expect(sanitizeText("abc", 2)).toBe("ab");
  });

  it("calcula progresso com base nas perguntas obrigatórias", () => {
    const allAnswers: Record<string, { optionKeys: string[] }> = {};
    for (const question of FEEDBACK_QUESTIONNAIRE.questions) {
      if (question.kind !== "OPEN") {
        allAnswers[question.key] = { optionKeys: [question.options[0].key] };
      }
    }
    expect(feedbackCompletionRatio(allAnswers)).toBe(100);
    delete allAnswers.q1;
    expect(feedbackCompletionRatio(allAnswers)).toBeLessThan(100);
  });

  it("rejeita payload que não é objeto", () => {
    const result = validateFeedbackSubmission(null as unknown as {});
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors).toContain("Payload inválido.");
  });
});
