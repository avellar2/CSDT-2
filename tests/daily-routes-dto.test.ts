import { beforeEach, describe, expect, it, vi } from "vitest";
import fs from "fs";
import path from "path";

/**
 * Regressão do TypeError "Cannot read properties of undefined (reading 'demands')"
 * em DailyRoutesPanel:
 *
 * - a página `/daily-demands` precisa usar o DTO completo de `/api/routes`
 *   (counts + membershipId), não o DTO simplificado de `/api/daily-demands`;
 * - payload incompleto é normalizado e contador desconhecido jamais vira zero;
 * - rota com OS externas vinculadas também não pode ser excluída.
 */

const {
  dailyRouteFindMany,
  dailyRouteFindUnique,
  dailyRouteDelete,
  dailyRouteTechnicianFindMany,
  profileFindUnique,
  profileFindMany,
  getUser,
  prismaMock,
} = vi.hoisted(() => {
  const mocks = {
    dailyRouteFindMany: vi.fn(),
    dailyRouteFindUnique: vi.fn(),
    dailyRouteDelete: vi.fn(),
    dailyRouteTechnicianFindMany: vi.fn(),
    profileFindUnique: vi.fn(),
    profileFindMany: vi.fn(),
    getUser: vi.fn(),
  };

  const prismaMock: any = {
    profile: {
      findUnique: mocks.profileFindUnique,
      findMany: mocks.profileFindMany,
    },
    dailyRoute: {
      findMany: mocks.dailyRouteFindMany,
      findUnique: mocks.dailyRouteFindUnique,
      delete: mocks.dailyRouteDelete,
      create: vi.fn(),
      update: vi.fn(),
    },
    dailyRouteTechnician: {
      findMany: mocks.dailyRouteTechnicianFindMany,
      updateMany: vi.fn(),
      update: vi.fn(),
    },
    async $transaction(fn: (tx: unknown) => unknown) {
      return fn(prismaMock);
    },
    async $disconnect() {},
  };

  return { ...mocks, prismaMock };
});

vi.mock("@/utils/prisma", () => ({ default: prismaMock }));

vi.mock("@prisma/client", () => ({
  Prisma: {
    PrismaClientKnownRequestError: class PrismaClientKnownRequestError extends Error {
      code: string;
      constructor(message: string, options?: { code?: string }) {
        super(message);
        this.code = options?.code || "P2002";
      }
    },
  },
  PrismaClient: class {
    profile = prismaMock.profile;
    dailyRoute = prismaMock.dailyRoute;
    dailyRouteTechnician = prismaMock.dailyRouteTechnician;
    async $disconnect() {}
  },
}));

vi.mock("@/lib/supabaseClient", () => ({
  supabase: { auth: { getUser } },
}));

import routesHandler from "@/pages/api/routes/index";
import routeHandler from "@/pages/api/routes/[id]";
import {
  normalizeDailyRoute,
  normalizeDailyRoutes,
  normalizeRouteCounts,
  routeEntityCount,
  routeIsEmpty,
  type DailyRouteDTO,
} from "@/utils/dailyRouteDto";

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

function makeReq(
  method: string,
  query: Record<string, unknown> = {},
  token: string | null = "token-ok"
) {
  return {
    method,
    query,
    headers: token ? { authorization: `Bearer ${token}` } : {},
    body: {},
  } as any;
}

function makeRouteRecord(overrides: Record<string, unknown> = {}) {
  return {
    id: 55,
    date: new Date("2026-04-10T00:00:00.000Z"),
    name: "Carro 1",
    vehicle: "Van",
    status: "PLANNED",
    createdBy: "user-1",
    updatedBy: null,
    closedBy: null,
    closedAt: null,
    createdAt: new Date("2026-04-09T12:00:00.000Z"),
    updatedAt: new Date("2026-04-09T12:00:00.000Z"),
    technicians: [
      {
        id: 901,
        technicianId: 10,
        technician: { id: 10, displayName: "Ana Souza" },
      },
    ],
    _count: { demands: 0, technicalTickets: 0, chamados: 0, osExternas: 0 },
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  loginAs(ADMIN);
  dailyRouteFindMany.mockResolvedValue([makeRouteRecord()]);
  dailyRouteFindUnique.mockResolvedValue(makeRouteRecord());
  dailyRouteDelete.mockResolvedValue({ id: 55 });
});

describe("normalização do DTO de rotas", () => {
  const counts = { demands: 2, tickets: 1, chamados: 0, osExternas: 0 };

  it("preserva o DTO completo devolvido por /api/routes", () => {
    const route = normalizeDailyRoute({
      id: 55,
      date: "2026-04-10",
      name: "Carro 1",
      vehicle: "Van",
      status: "PLANNED",
      technicians: [
        { membershipId: 901, technicianId: 10, displayName: "Ana Souza" },
      ],
      counts,
    });

    expect(route).not.toBeNull();
    expect(route!.counts).toEqual(counts);
    expect(route!.technicians[0].membershipId).toBe(901);
    expect(routeIsEmpty(route!)).toBe(false);
  });

  it("counts ausente vira null e a rota NUNCA é tratada como vazia", () => {
    const route = normalizeDailyRoute({
      id: 55,
      name: "Carro 1",
      technicians: [],
    });

    expect(route!.counts).toBeNull();
    expect(routeEntityCount(route!)).toBeNull();
    expect(routeIsEmpty(route!)).toBe(false);
  });

  it("payload antigo sem osExternas também fica com contadores desconhecidos", () => {
    // Evita excluir rota com OS externas quando o backend ainda não conta essa entidade.
    expect(
      normalizeRouteCounts({ demands: 0, tickets: 0, chamados: 0 })
    ).toBeNull();
  });

  it("só é vazia quando todos os contadores são conhecidos e zerados", () => {
    const empty = normalizeDailyRoute({
      id: 55,
      name: "Carro 1",
      counts: { demands: 0, tickets: 0, chamados: 0, osExternas: 0 },
    }) as DailyRouteDTO;

    expect(routeIsEmpty(empty)).toBe(true);
  });

  it("rota com apenas OS externas não é vazia", () => {
    const route = normalizeDailyRoute({
      id: 55,
      name: "Carro 1",
      counts: { demands: 0, tickets: 0, chamados: 0, osExternas: 1 },
    }) as DailyRouteDTO;

    expect(routeEntityCount(route)).toBe(1);
    expect(routeIsEmpty(route)).toBe(false);
  });

  it("aceita o vínculo legado com `id` e mantém membershipId nulo", () => {
    const route = normalizeDailyRoute({
      id: 55,
      name: "Carro 1",
      technicians: [{ id: 901, technicianId: 10, displayName: "Ana Souza" }],
      counts: { demands: 0, tickets: 0, chamados: 0, osExternas: 0 },
    }) as DailyRouteDTO;

    expect(route.technicians[0]).toEqual({
      membershipId: 901,
      technicianId: 10,
      displayName: "Ana Souza",
    });
  });

  it("descarta entradas inválidas em vez de quebrar a renderização", () => {
    const routes = normalizeDailyRoutes([
      { id: 1, name: "Rota 1", counts: { demands: 0, tickets: 0, chamados: 0, osExternas: 0 } },
      { id: 2, name: "" },
      { id: "x", name: "Inválida" },
      null,
      "lixo",
    ]);

    expect(routes).toHaveLength(1);
    expect(routes[0].id).toBe(1);
    expect(normalizeDailyRoutes(undefined)).toEqual([]);
    expect(normalizeDailyRoutes({ routes: [] })).toEqual([]);
  });
});

describe("GET /api/routes — DTO completo consumido pelo painel", () => {
  it("devolve counts (inclusive OS externas) e membershipId", async () => {
    dailyRouteFindMany.mockResolvedValue([
      makeRouteRecord({
        _count: { demands: 1, technicalTickets: 2, chamados: 3, osExternas: 4 },
      }),
    ]);

    const res = makeRes();
    await routesHandler(makeReq("GET", { date: "2026-04-10", includeClosed: "1" }), res);

    expect(res.statusCode).toBe(200);
    expect(res.body.routes[0].counts).toEqual({
      demands: 1,
      tickets: 2,
      chamados: 3,
      osExternas: 4,
    });
    expect(res.body.routes[0].technicians[0].membershipId).toBe(901);

    const include = dailyRouteFindMany.mock.calls[0][0].include;
    expect(include._count.select.osExternas).toBe(true);
  });

  it("includeClosed=1 não restringe a rotas abertas", async () => {
    const res = makeRes();
    await routesHandler(makeReq("GET", { date: "2026-04-10", includeClosed: "1" }), res);

    const where = dailyRouteFindMany.mock.calls[0][0].where;
    expect(where.status).toEqual({ not: "CANCELLED" });
  });

  it("técnico só recebe as rotas em que participa (escopo preservado)", async () => {
    loginAs(TECH);

    const res = makeRes();
    await routesHandler(makeReq("GET", { date: "2026-04-10", includeClosed: "1" }), res);

    const where = dailyRouteFindMany.mock.calls[0][0].where;
    expect(where.technicians).toEqual({
      some: { technicianId: 10, active: true },
    });
  });

  it("mantém os campos usados pelo filtro de rota de /scales?view=tickets", async () => {
    const res = makeRes();
    await routesHandler(makeReq("GET", { date: "2026-04-10", includeClosed: "1" }), res);

    const route = res.body.routes[0];
    // RouteOption em src/hooks/useScales.ts
    expect(route).toMatchObject({
      id: 55,
      name: "Carro 1",
      vehicle: "Van",
      status: "PLANNED",
    });
    expect(route.technicians[0]).toMatchObject({
      technicianId: 10,
      displayName: "Ana Souza",
    });
  });
});

describe("DELETE /api/routes/[id] — só exclui rota realmente vazia", () => {
  it("exclui rota sem demandas, chamados e OS externas", async () => {
    const res = makeRes();
    await routeHandler(makeReq("DELETE", { id: "55" }), res);

    expect(res.statusCode).toBe(200);
    expect(dailyRouteDelete).toHaveBeenCalledWith({ where: { id: 55 } });
  });

  it("bloqueia rota com demandas", async () => {
    dailyRouteFindUnique.mockResolvedValue(
      makeRouteRecord({
        _count: { demands: 1, technicalTickets: 0, chamados: 0, osExternas: 0 },
      })
    );

    const res = makeRes();
    await routeHandler(makeReq("DELETE", { id: "55" }), res);

    expect(res.statusCode).toBe(409);
    expect(dailyRouteDelete).not.toHaveBeenCalled();
  });

  it("bloqueia rota com chamados técnicos", async () => {
    dailyRouteFindUnique.mockResolvedValue(
      makeRouteRecord({
        _count: { demands: 0, technicalTickets: 1, chamados: 0, osExternas: 0 },
      })
    );

    const res = makeRes();
    await routeHandler(makeReq("DELETE", { id: "55" }), res);

    expect(res.statusCode).toBe(409);
    expect(dailyRouteDelete).not.toHaveBeenCalled();
  });

  it("bloqueia rota com chamados de escala (Reagend.)", async () => {
    dailyRouteFindUnique.mockResolvedValue(
      makeRouteRecord({
        _count: { demands: 0, technicalTickets: 0, chamados: 1, osExternas: 0 },
      })
    );

    const res = makeRes();
    await routeHandler(makeReq("DELETE", { id: "55" }), res);

    expect(res.statusCode).toBe(409);
    expect(dailyRouteDelete).not.toHaveBeenCalled();
  });

  it("bloqueia rota com OS externas vinculadas", async () => {
    dailyRouteFindUnique.mockResolvedValue(
      makeRouteRecord({
        _count: { demands: 0, technicalTickets: 0, chamados: 0, osExternas: 1 },
      })
    );

    const res = makeRes();
    await routeHandler(makeReq("DELETE", { id: "55" }), res);

    expect(res.statusCode).toBe(409);
    expect(res.body.error).toContain("OS externas");
    expect(dailyRouteDelete).not.toHaveBeenCalled();
  });

  it("consulta o contador de OS externas antes de decidir", async () => {
    const res = makeRes();
    await routeHandler(makeReq("DELETE", { id: "55" }), res);

    const select = dailyRouteFindUnique.mock.calls[0][0].include._count.select;
    expect(select.osExternas).toBe(true);
  });

  it("técnico não exclui rota", async () => {
    loginAs(TECH);
    dailyRouteFindUnique.mockResolvedValue(
      makeRouteRecord({
        technicians: [{ technicianId: 10 }],
        _count: { demands: 0, technicalTickets: 0, chamados: 0, osExternas: 0 },
      })
    );

    const res = makeRes();
    await routeHandler(makeReq("DELETE", { id: "55" }), res);

    expect(res.statusCode).toBe(403);
    expect(dailyRouteDelete).not.toHaveBeenCalled();
  });

  it("exige autenticação", async () => {
    getUser.mockResolvedValue({ data: { user: null }, error: { message: "x" } });

    const res = makeRes();
    await routeHandler(makeReq("DELETE", { id: "55" }, null), res);

    expect(res.statusCode).toBe(401);
    expect(dailyRouteDelete).not.toHaveBeenCalled();
  });
});

describe("Regressões de contrato nas telas", () => {
  const readSrc = (rel: string) =>
    fs.readFileSync(path.join(process.cwd(), rel), "utf8");

  it("daily-demands não usa mais o DTO simplificado de /api/daily-demands", () => {
    const src = readSrc("src/pages/daily-demands.tsx");

    expect(src).not.toContain("setRoutes(demandsResult.routes");
    expect(src).toContain("/api/routes?date=");
    expect(src).toContain("includeClosed=1");
    expect(src).toContain("normalizeDailyRoutes");
    // falha de rotas é aviso local, não erro de página
    expect(src).toContain("routesError");
    expect(src).toContain("routesUnavailable");
  });

  it("o painel não lê counts sem proteção", () => {
    const src = readSrc("src/components/DailyRoutesPanel.tsx");

    expect(src).not.toMatch(/route\.counts\.demands/);
    expect(src).not.toMatch(/counts\?\.demands \?\? 0/);
    expect(src).toContain("routeIsEmpty");
    expect(src).toContain("route.counts?.osExternas");
  });

  it("backend conta OS externas no DTO das rotas", () => {
    const api = readSrc("src/utils/operationalRouteApi.ts");
    expect(api).toContain("osExternas: true");
    expect(api).toContain("osExternas: route._count.osExternas");
  });

  it("backend bloqueia DELETE de rota com OS externas", () => {
    const src = readSrc("src/pages/api/routes/[id].ts");
    expect(src).toContain("counts.osExternas > 0");
  });

  it("escadas/chamados continuam buscando rotas pelo mesmo endpoint completo", () => {
    const src = readSrc("src/hooks/useScales.ts");
    expect(src).toContain("/api/routes?date=");
    expect(src).toContain("includeClosed=1");
    expect(src).toContain("fetchRoutesForDate");
  });
});
