import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * OS pendentes criadas antes da rota:
 * - ADMIN/ADMTOTAL localizam OS sem rota (inclusive por data);
 * - atribuição à equipe correta via /api/routes/assign com auditoria em
 *   RouteTransfer (entityType OS_EXTERNA);
 * - técnicos não recebem a lista e não atribuem;
 * - OS assinadas permanecem intactas.
 */

const {
  osExternaFindUnique,
  osExternaUpdate,
  osExternaFindMany,
  dailyRouteFindUnique,
  routeTransferCreate,
  schoolFindMany,
  dailyRouteTechnicianFindMany,
  dailyRouteFindMany,
  profileFindUnique,
  getUser,
  prismaMock,
} = vi.hoisted(() => {
  const mocks = {
    osExternaFindUnique: vi.fn(),
    osExternaUpdate: vi.fn(),
    osExternaFindMany: vi.fn(),
    dailyRouteFindUnique: vi.fn(),
    routeTransferCreate: vi.fn(),
    schoolFindMany: vi.fn(),
    dailyRouteTechnicianFindMany: vi.fn(),
    dailyRouteFindMany: vi.fn(),
    profileFindUnique: vi.fn(),
    getUser: vi.fn(),
  };

  const prismaMock: any = {
    profile: { findUnique: mocks.profileFindUnique },
    oSExterna: {
      findUnique: mocks.osExternaFindUnique,
      update: mocks.osExternaUpdate,
      findMany: mocks.osExternaFindMany,
    },
    dailyRoute: { findUnique: mocks.dailyRouteFindUnique, findMany: mocks.dailyRouteFindMany },
    dailyRouteTechnician: { findMany: mocks.dailyRouteTechnicianFindMany },
    routeTransfer: { create: mocks.routeTransferCreate },
    school: { findMany: mocks.schoolFindMany },
    async $transaction(fn: (tx: unknown) => unknown) {
      return fn(prismaMock);
    },
    async $disconnect() {},
  };

  return { ...mocks, prismaMock };
});

vi.mock("@/utils/prisma", () => ({ default: prismaMock }));

vi.mock("@prisma/client", () => ({
  Prisma: {},
  RouteEntityType: {
    DEMAND: "DEMAND",
    TECHNICAL_TICKET: "TECHNICAL_TICKET",
    CHAMADO: "CHAMADO",
    OS_EXTERNA: "OS_EXTERNA",
  },
  PrismaClient: class {
    profile = prismaMock.profile;
    oSExterna = prismaMock.oSExterna;
    dailyRoute = prismaMock.dailyRoute;
    dailyRouteTechnician = prismaMock.dailyRouteTechnician;
    routeTransfer = prismaMock.routeTransfer;
    school = prismaMock.school;
    async $disconnect() {}
  },
}));

vi.mock("@/lib/supabaseClient", () => ({
  supabase: { auth: { getUser } },
}));

import assignHandler from "@/pages/api/routes/assign";
import allOsHandler from "@/pages/api/get-all-os-externas";

const ADMIN = { id: 1, role: "ADMIN", displayName: "Admin Geral", schoolId: null };
const TECH = { id: 10, role: "TECH", displayName: "Ana Souza", schoolId: null };

function makeRes() {
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

function loginAs(profile: any) {
  getUser.mockResolvedValue({
    data: { user: { id: `user-${profile.id}`, email: "user@example.com" } },
    error: null,
  });
  profileFindUnique.mockResolvedValue(profile);
}

function assignRequest(body: Record<string, unknown>, token: string | null = "token-ok") {
  return {
    method: "POST",
    query: {},
    headers: token ? { authorization: `Bearer ${token}` } : {},
    body,
  } as any;
}

function makeOs(overrides: Record<string, unknown> = {}) {
  return {
    id: 700,
    status: "Pendente",
    data: "2026-04-10",
    routeId: null,
    createdAt: new Date("2026-04-10T12:00:00.000Z"),
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  loginAs(ADMIN);
  osExternaUpdate.mockResolvedValue({});
  routeTransferCreate.mockResolvedValue({ id: 1 });
  osExternaFindUnique.mockResolvedValue(makeOs());
  dailyRouteFindUnique.mockResolvedValue({
    id: 55,
    date: new Date("2026-04-10T00:00:00.000Z"),
    status: "PLANNED",
    name: "Carro 1",
  });
  osExternaFindMany.mockResolvedValue([makeOs()]);
  schoolFindMany.mockResolvedValue([]);
  dailyRouteTechnicianFindMany.mockResolvedValue([{ routeId: 55 }]);
  dailyRouteFindMany.mockResolvedValue([{ date: new Date("2026-04-10T00:00:00.000Z") }]);
});

describe("POST /api/routes/assign — OS_EXTERNA", () => {
  it("admite atribuir OS sem rota e registra auditoria", async () => {
    const res = makeRes();
    await assignHandler(
      assignRequest({ entityType: "OS_EXTERNA", entityId: 700, routeId: 55, note: "rota criada depois" }),
      res
    );

    expect(res.statusCode).toBe(200);
    expect(res.body.changed).toBe(true);
    expect(osExternaUpdate).toHaveBeenCalledWith({
      where: { id: 700 },
      data: { routeId: 55 },
    });
    expect(routeTransferCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        entityType: "OS_EXTERNA",
        entityId: 700,
        fromRouteId: null,
        toRouteId: 55,
        movedBy: "user-1",
        note: "rota criada depois",
      }),
    });
  });

  it("não atribui OS a rota de outra data", async () => {
    dailyRouteFindUnique.mockResolvedValue({
      id: 55,
      date: new Date("2026-04-11T00:00:00.000Z"),
      status: "PLANNED",
      name: "Carro 1",
    });

    const res = makeRes();
    await assignHandler(
      assignRequest({ entityType: "OS_EXTERNA", entityId: 700, routeId: 55 }),
      res
    );

    expect(res.statusCode).toBe(400);
    // A transação é revertida no banco real; o que não pode existir é auditoria
    // de uma atribuição inválida.
    expect(routeTransferCreate).not.toHaveBeenCalled();
  });

  it("não redistribui OS assinada (histórico preservado)", async () => {
    osExternaFindUnique.mockResolvedValue(makeOs({ status: "Assinado" }));

    const res = makeRes();
    await assignHandler(
      assignRequest({ entityType: "OS_EXTERNA", entityId: 700, routeId: 55 }),
      res
    );

    expect(res.statusCode).toBe(409);
    expect(osExternaUpdate).not.toHaveBeenCalled();
  });

  it("técnico não atribui OS a rota", async () => {
    loginAs(TECH);

    const res = makeRes();
    await assignHandler(
      assignRequest({ entityType: "OS_EXTERNA", entityId: 700, routeId: 55 }),
      res
    );

    expect(res.statusCode).toBe(403);
    expect(osExternaUpdate).not.toHaveBeenCalled();
  });

  it("registra a rota de origem ao mover uma OS entre equipes", async () => {
    osExternaFindUnique.mockResolvedValue(makeOs({ routeId: 66 }));

    const res = makeRes();
    await assignHandler(
      assignRequest({ entityType: "OS_EXTERNA", entityId: 700, routeId: 55 }),
      res
    );

    expect(res.statusCode).toBe(200);
    expect(routeTransferCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({ fromRouteId: 66, toRouteId: 55 }),
    });
  });

  it("retorna 404 para OS inexistente", async () => {
    osExternaFindUnique.mockResolvedValue(null);

    const res = makeRes();
    await assignHandler(
      assignRequest({ entityType: "OS_EXTERNA", entityId: 999, routeId: 55 }),
      res
    );

    expect(res.statusCode).toBe(404);
    expect(osExternaUpdate).not.toHaveBeenCalled();
  });
});

describe("GET /api/get-all-os-externas?unassigned=1", () => {
  function makeReq(query: Record<string, unknown>, token: string | null = "token-ok") {
    return {
      method: "GET",
      query,
      headers: token ? { authorization: `Bearer ${token}` } : {},
      body: {},
    } as any;
  }

  it("ADMIN localiza OS sem rota (somente operacionais)", async () => {
    const res = makeRes();
    await allOsHandler(makeReq({ unassigned: "1", date: "2026-04-10" }), res);

    expect(res.statusCode).toBe(200);
    expect(osExternaFindMany).toHaveBeenCalledWith({
      where: {
        routeId: null,
        status: { not: "Assinado" },
        data: "2026-04-10",
      },
      orderBy: { createdAt: "desc" },
      take: 500,
    });
  });

  it("técnico não recebe a lista de OS sem rota", async () => {
    loginAs(TECH);

    const res = makeRes();
    await allOsHandler(makeReq({ unassigned: "1" }), res);

    expect(res.statusCode).toBe(403);
    expect(osExternaFindMany).not.toHaveBeenCalled();
  });

  it("valida o parâmetro date", async () => {
    const res = makeRes();
    await allOsHandler(makeReq({ unassigned: "1", date: "10/04/2026" }), res);

    expect(res.statusCode).toBe(400);
    expect(osExternaFindMany).not.toHaveBeenCalled();
  });

  it("exige autenticação", async () => {
    getUser.mockResolvedValue({ data: { user: null }, error: { message: "x" } });

    const res = makeRes();
    await allOsHandler(makeReq({ unassigned: "1" }, null), res);

    expect(res.statusCode).toBe(401);
    expect(osExternaFindMany).not.toHaveBeenCalled();
  });
});
