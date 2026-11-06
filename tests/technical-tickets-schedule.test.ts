import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Problem A — autorização do agendamento de chamados técnicos.
 *
 * O handler real é executado com autenticação substituída por um dublê,
 * mas a regra de acesso (`operationalRoutes`) é a implementação de produção.
 */
const {
  ticketFindUnique,
  ticketUpdate,
  routeFindUnique,
  eventCreate,
  transferCreate,
  membershipFindMany,
  routeFindMany,
  requireAuthMock,
} = vi.hoisted(() => ({
  ticketFindUnique: vi.fn(),
  ticketUpdate: vi.fn(),
  routeFindUnique: vi.fn(),
  eventCreate: vi.fn(),
  transferCreate: vi.fn(),
  membershipFindMany: vi.fn(),
  routeFindMany: vi.fn(),
  requireAuthMock: vi.fn(),
}));

vi.mock("@prisma/client", () => ({
  Prisma: {},
  PrismaClient: class {
    technicalTicket = { findUnique: ticketFindUnique, update: ticketUpdate };
    dailyRoute = { findUnique: routeFindUnique };
    scheduleEvent = { create: eventCreate };
    routeTransfer = { create: transferCreate };
    async $transaction(fn: (tx: unknown) => unknown) {
      return fn(this);
    }
    async $disconnect() {}
  },
}));

vi.mock("@/utils/prisma", () => ({
  default: {
    dailyRouteTechnician: { findMany: membershipFindMany },
    dailyRoute: { findMany: routeFindMany, count: vi.fn() },
  },
}));

vi.mock("@/utils/api-auth", () => ({
  requireAuth: requireAuthMock,
  requireRole: vi.fn(),
  AUTH_ROLES: {},
}));

import scheduleHandler from "@/pages/api/technical-tickets/schedule";

function createResponse() {
  const res: any = {
    statusCode: 200,
    body: undefined,
    status(code: number) {
      res.statusCode = code;
      return res;
    },
    json(body: unknown) {
      res.body = body;
      return res;
    },
    setHeader() {
      return res;
    },
  };
  return res;
}

function createRequest(body: Record<string, unknown>) {
  return { method: "POST", body, query: {}, headers: {} } as any;
}

function authenticateAs(role: string, profileId = 10) {
  requireAuthMock.mockResolvedValue({
    id: `user-${profileId}`,
    email: "tech@example.com",
    profile: { id: profileId, role, displayName: "Técnico" },
  });
}

const routeDay = "2026-11-06";
const oldDay = "2026-10-01";

function makeTicket(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    title: "Chamado",
    description: "Descrição",
    category: "OTHER",
    priority: "MEDIUM",
    status: "OPEN",
    routeId: null,
    scheduledDate: null,
    notes: null,
    School: { name: "Escola A", email: null },
    ...overrides,
  };
}

const baseBody = {
  ticketId: "1",
  scheduledTime: "09:00",
  assignedTo: "Equipe",
  priority: "MEDIUM",
};

describe("POST /api/technical-tickets/schedule — autorização (Problem A)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    membershipFindMany.mockResolvedValue([{ routeId: 1 }]);
    routeFindMany.mockResolvedValue([
      { date: new Date(`${routeDay}T00:00:00.000Z`) },
    ]);
    routeFindUnique.mockResolvedValue({
      id: 1,
      date: new Date(`${routeDay}T00:00:00.000Z`),
      status: "PLANNED",
    });
    eventCreate.mockResolvedValue({ id: 99 });
    ticketUpdate.mockImplementation(async ({ data }: any) =>
      makeTicket({ ...data, School: { name: "Escola A", email: null } })
    );
    transferCreate.mockResolvedValue({ id: 1 });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, text: async () => "" })
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("técnico do Carro X não agenda chamado do Carro Y", async () => {
    authenticateAs("TECH", 10);
    ticketFindUnique.mockResolvedValue(
      makeTicket({
        routeId: 2,
        scheduledDate: new Date(`${routeDay}T10:00:00-03:00`),
      })
    );

    const res = createResponse();
    await scheduleHandler(
      createRequest({ ...baseBody, scheduledDate: routeDay, routeId: 1 }),
      res
    );

    expect(res.statusCode).toBe(403);
    expect(res.body.error).toContain("outra rota");
    expect(ticketUpdate).not.toHaveBeenCalled();
    expect(eventCreate).not.toHaveBeenCalled();
  });

  it("técnico não agenda em rota da qual não participa", async () => {
    authenticateAs("TECH", 10);
    // Chamado antigo da fila técnica (dia sem rotas) — acessível ao técnico.
    ticketFindUnique.mockResolvedValue(makeTicket({ routeId: null }));

    const res = createResponse();
    await scheduleHandler(
      createRequest({
        ...baseBody,
        scheduledDate: oldDay,
        routeId: 1,
      }),
      res
    );

    // A rota 1 é de outro dia: barrado pela validação de data, não por acesso.
    expect(res.statusCode).toBe(400);

    // Já a rota de outro técnico no mesmo dia é bloqueada por permissão.
    routeFindUnique.mockResolvedValue({
      id: 2,
      date: new Date(`${oldDay}T00:00:00.000Z`),
      status: "PLANNED",
    });
    const res2 = createResponse();
    await scheduleHandler(
      createRequest({ ...baseBody, scheduledDate: oldDay, routeId: 2 }),
      res2
    );

    expect(res2.statusCode).toBe(403);
    expect(res2.body.error).toContain("rotas das quais participa");
  });

  it("técnico não pode devolver chamado para a fila administrativa", async () => {
    authenticateAs("TECH", 10);
    ticketFindUnique.mockResolvedValue(
      makeTicket({
        routeId: 1,
        scheduledDate: new Date(`${routeDay}T10:00:00-03:00`),
      })
    );

    const res = createResponse();
    await scheduleHandler(
      createRequest({ ...baseBody, scheduledDate: routeDay, routeId: null }),
      res
    );

    expect(res.statusCode).toBe(403);
    expect(res.body.error).toContain("ADMIN ou ADMTOTAL");
    expect(ticketUpdate).not.toHaveBeenCalled();
  });

  it("técnico não move chamado antigo para um dia que já tem rotas sem escolher a rota", async () => {
    authenticateAs("TECH", 10);
    ticketFindUnique.mockResolvedValue(makeTicket({ routeId: null }));

    const res = createResponse();
    await scheduleHandler(
      createRequest({ ...baseBody, scheduledDate: routeDay, routeId: null }),
      res
    );

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toContain("Existem rotas nesta data");
  });

  it("perfil sem permissão operacional não agenda chamados", async () => {
    authenticateAs("ONLYREAD", 30);
    ticketFindUnique.mockResolvedValue(makeTicket());

    const res = createResponse();
    await scheduleHandler(
      createRequest({ ...baseBody, scheduledDate: oldDay, routeId: null }),
      res
    );

    expect(res.statusCode).toBe(403);
    expect(ticketUpdate).not.toHaveBeenCalled();
  });

  it("técnico agenda chamado da própria rota e a movimentação é auditada", async () => {
    authenticateAs("TECH", 10);
    ticketFindUnique.mockResolvedValue(makeTicket({ routeId: null }));

    const res = createResponse();
    await scheduleHandler(
      createRequest({ ...baseBody, scheduledDate: routeDay, routeId: 1 }),
      res
    );

    expect(res.statusCode).toBe(200);
    expect(ticketUpdate.mock.calls[0][0].data.routeId).toBe(1);
    // 09:00 em America/Sao_Paulo = 12:00Z — a data operacional precisa ser
    // a mesma do dia da rota, independente do fuso do servidor.
    expect(
      (ticketUpdate.mock.calls[0][0].data.scheduledDate as Date).toISOString()
    ).toBe("2026-11-06T12:00:00.000Z");
    expect(transferCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        entityType: "TECHNICAL_TICKET",
        fromRouteId: null,
        toRouteId: 1,
        movedBy: "user-10",
      }),
    });
  });

  it("gestor pode agendar em qualquer rota da data", async () => {
    authenticateAs("ADMIN", 1);
    ticketFindUnique.mockResolvedValue(
      makeTicket({
        routeId: 2,
        scheduledDate: new Date(`${routeDay}T10:00:00-03:00`),
      })
    );

    const res = createResponse();
    await scheduleHandler(
      createRequest({ ...baseBody, scheduledDate: routeDay, routeId: 1 }),
      res
    );

    expect(res.statusCode).toBe(200);
    expect(membershipFindMany).not.toHaveBeenCalled();
  });
});
