import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Regressões do item 1 e da revisão de permissões (item 3):
 * - reagendar sem enviar routeId não pode deixar o chamado preso a uma rota
 *   de outra data;
 * - data-only deve ser gravada ao meio-dia de America/Sao_Paulo;
 * - ONLYREAD e SCHOOL não operam chamados técnicos;
 * - técnico só altera chamados da própria equipe.
 */
const {
  ticketFindUnique,
  ticketUpdate,
  routeFindUnique,
  transferCreate,
  membershipFindMany,
  routeFindMany,
  requireAuthMock,
} = vi.hoisted(() => ({
  ticketFindUnique: vi.fn(),
  ticketUpdate: vi.fn(),
  routeFindUnique: vi.fn(),
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
  AUTH_ROLES: {
    ADMIN: "ADMIN",
    TECH: "TECH",
    ADMTOTAL: "ADMTOTAL",
    ONLYREAD: "ONLYREAD",
    SCHOOL: "SCHOOL",
  },
  TICKET_OPERATOR_ROLES: ["ADMIN", "ADMTOTAL", "TECH"],
  canOperateTickets: (role: string) =>
    ["ADMIN", "ADMTOTAL", "TECH"].includes(role),
}));

import updateHandler from "@/pages/api/technical-tickets/update";

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
  return { method: "PUT", body, query: { ticketId: "5" }, headers: {} } as any;
}

function authenticateAs(role: string, profileId = 10, schoolId: number | null = null) {
  requireAuthMock.mockResolvedValue({
    id: `user-${profileId}`,
    email: "tech@example.com",
    profile: { id: profileId, role, displayName: "Usuário", schoolId },
  });
}

const routeDay = "2026-11-06";
const newDay = "2026-11-10";

function makeTicket(overrides: Record<string, unknown> = {}) {
  return {
    id: 5,
    status: "SCHEDULED",
    priority: "MEDIUM",
    notes: null,
    routeId: 10,
    scheduledDate: new Date(`${routeDay}T12:00:00-03:00`),
    School: { name: "Escola A", email: null },
    ...overrides,
  };
}

describe("PUT /api/technical-tickets/update", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    ticketFindUnique.mockResolvedValue(makeTicket());
    ticketUpdate.mockImplementation(async ({ data }: any) =>
      makeTicket({ ...data, School: { name: "Escola A", email: null } })
    );
    transferCreate.mockResolvedValue({ id: 1 });
    membershipFindMany.mockResolvedValue([{ routeId: 10 }]);
    routeFindMany.mockResolvedValue([
      { date: new Date(`${routeDay}T00:00:00.000Z`) },
    ]);
    routeFindUnique.mockImplementation(async ({ where }: any) => ({
      id: where.id,
      date: new Date(
        `${where.id === 10 ? routeDay : newDay}T00:00:00.000Z`
      ),
      status: "PLANNED",
    }));
  });

  it("reagendar sem routeId desvincula da rota de outra data e audita", async () => {
    authenticateAs("ADMIN", 1);

    const res = createResponse();
    await updateHandler(
      createRequest({ scheduledDate: newDay, scheduledTime: "09:00" }),
      res
    );

    expect(res.statusCode).toBe(200);
    const data = ticketUpdate.mock.calls[0][0].data;
    expect(data.routeId).toBeNull();
    expect(data.scheduledDate.toISOString()).toBe(`${newDay}T15:00:00.000Z`);
    expect(transferCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        entityType: "TECHNICAL_TICKET",
        entityId: 5,
        fromRouteId: 10,
        toRouteId: null,
        movedBy: "user-1",
        note: "Reagendamento para data diferente da rota",
      }),
    });
  });

  it("reagendar para a mesma data mantém o vínculo com a rota", async () => {
    authenticateAs("ADMIN", 1);

    const res = createResponse();
    await updateHandler(createRequest({ scheduledDate: routeDay }), res);

    expect(res.statusCode).toBe(200);
    expect(ticketUpdate.mock.calls[0][0].data.routeId).toBeUndefined();
    expect(transferCreate).not.toHaveBeenCalled();
  });

  it("data-only é gravada ao meio-dia de America/Sao_Paulo", async () => {
    authenticateAs("ADMIN", 1);

    const res = createResponse();
    await updateHandler(createRequest({ scheduledDate: newDay }), res);

    const stored = ticketUpdate.mock.calls[0][0].data.scheduledDate;
    expect(stored.toISOString()).toBe(`${newDay}T15:00:00.000Z`);
  });

  it("gestor pode transferir para rota válida da nova data", async () => {
    authenticateAs("ADMIN", 1);

    const res = createResponse();
    await updateHandler(
      createRequest({ scheduledDate: newDay, routeId: 11 }),
      res
    );

    expect(res.statusCode).toBe(200);
    expect(ticketUpdate.mock.calls[0][0].data.routeId).toBe(11);
    expect(transferCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({ fromRouteId: 10, toRouteId: 11 }),
    });
  });

  it("gestor pode desvincular explicitamente enviando routeId nulo", async () => {
    authenticateAs("ADMIN", 1);

    const res = createResponse();
    await updateHandler(createRequest({ routeId: null }), res);

    expect(res.statusCode).toBe(200);
    expect(ticketUpdate.mock.calls[0][0].data.routeId).toBeNull();
    expect(transferCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({ fromRouteId: 10, toRouteId: null }),
    });
  });

  it("ONLYREAD não atualiza chamados técnicos", async () => {
    authenticateAs("ONLYREAD", 30);

    const res = createResponse();
    await updateHandler(createRequest({ status: "RESOLVED" }), res);

    expect(res.statusCode).toBe(403);
    expect(ticketFindUnique).not.toHaveBeenCalled();
    expect(ticketUpdate).not.toHaveBeenCalled();
  });

  it("SCHOOL não atualiza chamados técnicos", async () => {
    authenticateAs("SCHOOL", 31, 25);

    const res = createResponse();
    await updateHandler(createRequest({ status: "RESOLVED" }), res);

    expect(res.statusCode).toBe(403);
    expect(ticketUpdate).not.toHaveBeenCalled();
  });

  it("técnico não altera chamado de outra rota", async () => {
    authenticateAs("TECH", 10);
    ticketFindUnique.mockResolvedValue(
      makeTicket({ routeId: 20, scheduledDate: new Date(`${routeDay}T12:00:00-03:00`) })
    );
    membershipFindMany.mockResolvedValue([{ routeId: 10 }]);

    const res = createResponse();
    await updateHandler(createRequest({ notes: "tentativa" }), res);

    expect(res.statusCode).toBe(403);
    expect(res.body.error).toContain("outra rota");
    expect(ticketUpdate).not.toHaveBeenCalled();
  });

  it("técnico não reagenda chamado com rota para outra data", async () => {
    authenticateAs("TECH", 10);

    const res = createResponse();
    await updateHandler(createRequest({ scheduledDate: newDay }), res);

    expect(res.statusCode).toBe(403);
    expect(ticketUpdate).not.toHaveBeenCalled();
  });

  it("técnico não transfere chamado para outra rota", async () => {
    authenticateAs("TECH", 10);
    membershipFindMany.mockResolvedValue([{ routeId: 10 }, { routeId: 11 }]);

    const res = createResponse();
    await updateHandler(createRequest({ routeId: 11 }), res);

    expect(res.statusCode).toBe(403);
    expect(res.body.error).toContain("ADMIN ou ADMTOTAL");
  });

  it("técnico atualiza chamado da própria equipe no mesmo dia", async () => {
    authenticateAs("TECH", 10);

    const res = createResponse();
    await updateHandler(createRequest({ status: "IN_PROGRESS" }), res);

    expect(res.statusCode).toBe(200);
    expect(ticketUpdate.mock.calls[0][0].data.status).toBe("IN_PROGRESS");
  });
});
