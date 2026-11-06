import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Testes de integração dos handlers de chamados técnicos sem banco:
 * autenticação e Prisma são substituídos por dublês, mas a regra de rotas
 * (`operationalRoutes`) usada pelo handler é a implementação real.
 */
const {
  ticketFindMany,
  ticketGroupBy,
  membershipFindMany,
  routeFindMany,
  requireAuthMock,
} = vi.hoisted(() => ({
  ticketFindMany: vi.fn(),
  ticketGroupBy: vi.fn(),
  membershipFindMany: vi.fn(),
  routeFindMany: vi.fn(),
  requireAuthMock: vi.fn(),
}));

vi.mock("@prisma/client", () => ({
  Prisma: {},
  PrismaClient: class {
    technicalTicket = {
      findMany: ticketFindMany,
      groupBy: ticketGroupBy,
    };
    $disconnect = vi.fn();
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

import listHandler from "@/pages/api/technical-tickets/list";

type FakeResponse = {
  statusCode: number;
  body: unknown;
  status: (code: number) => FakeResponse;
  json: (body: unknown) => FakeResponse;
  setHeader: () => FakeResponse;
};

function createResponse(): FakeResponse {
  const res: FakeResponse = {
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

function createRequest(query: Record<string, unknown> = {}) {
  return { method: "GET", query, body: {}, headers: {} } as any;
}

function authenticateAs(role: string, profileId = 10) {
  requireAuthMock.mockResolvedValue({
    id: `user-${profileId}`,
    email: "tech@example.com",
    profile: { id: profileId, role, displayName: "Técnico" },
  });
}

describe("GET /api/technical-tickets/list", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    ticketFindMany.mockResolvedValue([]);
    ticketGroupBy.mockResolvedValue([]);
    membershipFindMany.mockResolvedValue([]);
    routeFindMany.mockResolvedValue([]);
  });

  it("exige autenticação antes de consultar chamados", async () => {
    requireAuthMock.mockImplementation(async (_req, res) => {
      res.status(401).json({ error: "Token de autorização obrigatório" });
      return null;
    });

    const res = createResponse();
    await listHandler(createRequest(), res as any);

    expect(res.statusCode).toBe(401);
    expect(ticketFindMany).not.toHaveBeenCalled();
  });

  it("Problem A — exige token antes de qualquer leitura", async () => {
    requireAuthMock.mockImplementation(async (_req, res) => {
      res.status(401).json({ error: "Token de autorização obrigatório" });
      return null;
    });

    const res = createResponse();
    await listHandler(createRequest({ routeId: "unassigned" }), res as any);

    expect(res.statusCode).toBe(401);
    expect(membershipFindMany).not.toHaveBeenCalled();
  });

  it("Problem C — `unassigned` filtra por routeId nulo", async () => {
    authenticateAs("ADMIN");
    const res = createResponse();

    await listHandler(createRequest({ routeId: "unassigned" }), res as any);

    expect(res.statusCode).toBe(200);
    expect(ticketFindMany.mock.calls[0][0].where.routeId).toBeNull();
  });

  it("Problem C — ID numérico válido filtra pela rota", async () => {
    authenticateAs("ADMIN");
    const res = createResponse();

    await listHandler(createRequest({ routeId: "42" }), res as any);

    expect(ticketFindMany.mock.calls[0][0].where.routeId).toBe(42);
  });

  it("Problem C — `all` não aplica filtro de rota", async () => {
    authenticateAs("ADMIN");
    const res = createResponse();

    await listHandler(createRequest({ routeId: "all" }), res as any);

    expect(res.statusCode).toBe(200);
    expect(ticketFindMany.mock.calls[0][0].where.routeId).toBeUndefined();
  });

  it("Problem C — valor inválido retorna 400 (nunca NaN)", async () => {
    authenticateAs("ADMIN");

    for (const invalid of ["abc", "0", "-1", "1.5"]) {
      const res = createResponse();
      await listHandler(createRequest({ routeId: invalid }), res as any);

      expect(res.statusCode).toBe(400);
      expect(res.body).toMatchObject({
        error: expect.stringContaining("routeId"),
      });
    }

    expect(ticketFindMany).not.toHaveBeenCalled();
  });

  it("Problem B — técnico é filtrado pela data de cada chamado no backend", async () => {
    authenticateAs("TECH", 10);
    membershipFindMany.mockResolvedValue([{ routeId: 1 }]);
    routeFindMany.mockResolvedValue([
      { date: new Date("2026-11-06T00:00:00.000Z") },
    ]);

    const res = createResponse();
    await listHandler(createRequest(), res as any);

    expect(res.statusCode).toBe(200);
    const where = ticketFindMany.mock.calls[0][0].where;
    expect(Array.isArray(where.AND)).toBe(true);
    expect(where.AND[0].OR).toContainEqual({ routeId: { in: [1] } });

    // as estatísticas usam exatamente o mesmo escopo
    expect(ticketGroupBy.mock.calls[0][0].where).toBe(where);
  });

  it("gestor consulta sem restrição de rota", async () => {
    authenticateAs("ADMIN");
    const res = createResponse();

    await listHandler(createRequest(), res as any);

    expect(ticketFindMany.mock.calls[0][0].where.AND).toBeUndefined();
    expect(membershipFindMany).not.toHaveBeenCalled();
  });
});
