import { beforeEach, describe, expect, it, vi } from "vitest";
import { Prisma } from "@prisma/client";
import { generateFeedbackToken, hashFeedbackToken } from "@/utils/feedback/tokens";
import { FEEDBACK_QUESTIONNAIRE } from "@/utils/feedback/questionnaire";

const {
  inviteFindUnique,
  inviteUpdate,
  responseFindUnique,
  responseCreate,
} = vi.hoisted(() => ({
  inviteFindUnique: vi.fn(),
  inviteUpdate: vi.fn(),
  responseFindUnique: vi.fn(),
  responseCreate: vi.fn(),
}));

vi.mock("@/utils/prisma", () => {
  const txClient = {
    feedbackInvite: { findUnique: inviteFindUnique, update: inviteUpdate },
    feedbackResponse: { findUnique: responseFindUnique, create: responseCreate },
  };
  return {
    default: {
      ...txClient,
      $transaction: async (callback: (tx: typeof txClient) => unknown) =>
        callback(txClient),
    },
  };
});

import {
  getPublicInviteView,
  loadPublicInvite,
  submitFeedbackResponse,
} from "@/utils/feedback/public";

function makeInvite(overrides: Record<string, unknown> = {}) {
  return {
    id: 10,
    campaignId: 5,
    schoolId: 7,
    status: "SENT",
    recipientEmail: "escola@edu.br",
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    School: { name: "EM Teste" },
    Campaign: {
      id: 5,
      name: "Campanha",
      status: "SENDING",
      channel: "OFFICIAL",
      deadline: null,
    },
    ...overrides,
  };
}

function validPayload() {
  const answers: Record<string, unknown> = {};
  for (const question of FEEDBACK_QUESTIONNAIRE.questions) {
    if (question.kind === "OPEN") answers[question.key] = { text: "" };
    else answers[question.key] = { optionKeys: [question.options[0].key] };
  }
  return {
    answers,
    respondent: { name: "Maria", registration: "0012", role: "Diretora" },
  };
}

describe("API pública da pesquisa", () => {
  const token = generateFeedbackToken();

  beforeEach(() => {
    inviteFindUnique.mockReset();
    inviteUpdate.mockReset();
    responseFindUnique.mockReset();
    responseCreate.mockReset();
  });

  it("rejeita token implausível sem consultar o banco", async () => {
    const result = await loadPublicInvite("curto");
    expect(result.state).toBe("invalid");
    expect(result.invite).toBeNull();
    expect(inviteFindUnique).not.toHaveBeenCalled();
  });

  it("busca o convite apenas pelo hash do token, sem aceitar schoolId", async () => {
    inviteFindUnique.mockResolvedValue(makeInvite());
    responseFindUnique.mockResolvedValue(null);

    await loadPublicInvite(token);

    expect(inviteFindUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { tokenHash: hashFeedbackToken(token) } }),
    );
    const where = inviteFindUnique.mock.calls[0][0].where;
    expect(Object.keys(where)).toEqual(["tokenHash"]);
  });

  it("link de token desconhecido é inválido", async () => {
    inviteFindUnique.mockResolvedValue(null);
    const view = await getPublicInviteView(token);
    expect(view.state).toBe("invalid");
    expect(view.questionnaire).toBeNull();
    expect(view.school).toBeNull();
  });

  it("convite válido expõe apenas o formulário e o nome da escola", async () => {
    inviteFindUnique.mockResolvedValue(makeInvite());
    responseFindUnique.mockResolvedValue(null);

    const view = await getPublicInviteView(token);
    expect(view.state).toBe("available");
    expect(view.school).toEqual({ name: "EM Teste" });
    expect(view.questionnaire?.questions).toHaveLength(16);
    // Não há dados de outras escolas nem respostas de terceiros.
    expect(JSON.stringify(view)).not.toContain("cpf");
    expect(JSON.stringify(view)).not.toContain("submittedAt");
  });

  it("bloqueia resposta duplicada da mesma escola", async () => {
    inviteFindUnique.mockResolvedValue(makeInvite());
    responseFindUnique.mockResolvedValue({ id: 99 });

    const result = await submitFeedbackResponse(token, validPayload());
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.status).toBe(409);
    expect(responseCreate).not.toHaveBeenCalled();
  });

  it("bloqueia token expirado", async () => {
    inviteFindUnique.mockResolvedValue(
      makeInvite({ expiresAt: new Date(Date.now() - 1000) }),
    );
    responseFindUnique.mockResolvedValue(null);

    const result = await submitFeedbackResponse(token, validPayload());
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.status).toBe(410);
    expect(inviteUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: "EXPIRED" } }),
    );
  });

  it("bloqueia campanha encerrada", async () => {
    inviteFindUnique.mockResolvedValue(
      makeInvite({ Campaign: { id: 5, name: "C", status: "CLOSED", channel: "OFFICIAL" } }),
    );
    responseFindUnique.mockResolvedValue(null);

    const result = await submitFeedbackResponse(token, validPayload());
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.status).toBe(410);
  });

  it("rejeita resposta inválida antes de gravar", async () => {
    inviteFindUnique.mockResolvedValue(makeInvite());
    responseFindUnique.mockResolvedValue(null);

    const result = await submitFeedbackResponse(token, {
      answers: {},
      respondent: { name: "", registration: "", role: "" },
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.status).toBe(422);
    expect(responseCreate).not.toHaveBeenCalled();
  });

  it("grava resposta válida com escola e campanha do token", async () => {
    inviteFindUnique.mockResolvedValue(makeInvite());
    responseFindUnique.mockResolvedValue(null);
    responseCreate.mockResolvedValue({ id: 42 });
    inviteUpdate.mockResolvedValue({});

    const result = await submitFeedbackResponse(token, validPayload(), {
      ip: "203.0.113.5",
      userAgent: "jest",
    });

    expect(result).toEqual({ ok: true, responseId: 42 });

    const createArgs = responseCreate.mock.calls[0][0];
    expect(createArgs.data.schoolId).toBe(7);
    expect(createArgs.data.campaignId).toBe(5);
    expect(createArgs.data.inviteId).toBe(10);
    expect(createArgs.data.respondentName).toBe("Maria");
    expect(createArgs.data.respondentRegistration).toBe("0012");
    expect(createArgs.data.respondentRole).toBe("Diretora");
    expect(createArgs.data.Answer.create).toHaveLength(16);
    // IP não é gravado em texto puro.
    expect(createArgs.data.ipHash).not.toContain("203.0.113.5");

    expect(inviteUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: "ANSWERED" }) }),
    );
  });

  it("converte corrida de duplo clique (P2002) em 409", async () => {
    inviteFindUnique.mockResolvedValue(makeInvite());
    responseFindUnique.mockResolvedValue(null);
    responseCreate.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
        code: "P2002",
        clientVersion: "test",
      }),
    );

    const result = await submitFeedbackResponse(token, validPayload());
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.status).toBe(409);
  });
});
