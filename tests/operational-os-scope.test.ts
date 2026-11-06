import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Separação operacional de OS externas e demandas por rota.
 *
 * Cenário: dois carros, duas equipes, na mesma data.
 *   Rota 101 (Carro 1): Ana (10) e Bruno (11)
 *   Rota 202 (Carro 2): Carla (12) e Diego (13)
 *
 * A identidade é sempre a do token Bearer (requireAuth real); `userId` na
 * query não pode ampliar nem trocar o escopo.
 */

const {
  profileFindUnique,
  profileFindMany,
  schoolDemandFindMany,
  schoolDemandCount,
  osFindMany,
  osExternaFindMany,
  osExternaCount,
  visitTechnicianFindMany,
  dailyRouteFindMany,
  dailyRouteCount,
  dailyRouteTechnicianFindMany,
  schoolFindMany,
  getUser,
  prismaMock,
} = vi.hoisted(() => {
  const mocks = {
    profileFindUnique: vi.fn(),
    profileFindMany: vi.fn(),
    schoolDemandFindMany: vi.fn(),
    schoolDemandCount: vi.fn(),
    osFindMany: vi.fn(),
    osExternaFindMany: vi.fn(),
    osExternaCount: vi.fn(),
    visitTechnicianFindMany: vi.fn(),
    dailyRouteFindMany: vi.fn(),
    dailyRouteCount: vi.fn(),
    dailyRouteTechnicianFindMany: vi.fn(),
    schoolFindMany: vi.fn(),
    getUser: vi.fn(),
  };

  const prismaMock = {
    profile: { findUnique: mocks.profileFindUnique, findMany: mocks.profileFindMany },
    schoolDemand: { findMany: mocks.schoolDemandFindMany, count: mocks.schoolDemandCount },
    os: { findMany: mocks.osFindMany },
    oSExterna: { findMany: mocks.osExternaFindMany, count: mocks.osExternaCount },
    visitTechnician: { findMany: mocks.visitTechnicianFindMany },
    dailyRoute: { findMany: mocks.dailyRouteFindMany, count: mocks.dailyRouteCount },
    dailyRouteTechnician: { findMany: mocks.dailyRouteTechnicianFindMany },
    school: { findMany: mocks.schoolFindMany },
    async $disconnect() {},
  };

  return { ...mocks, prismaMock };
});

vi.mock("@/utils/prisma", () => ({ default: prismaMock }));

vi.mock("@prisma/client", () => ({
  Prisma: {},
  PrismaClient: class {
    profile = prismaMock.profile;
    schoolDemand = prismaMock.schoolDemand;
    os = prismaMock.os;
    oSExterna = prismaMock.oSExterna;
    visitTechnician = prismaMock.visitTechnician;
    dailyRoute = prismaMock.dailyRoute;
    dailyRouteTechnician = prismaMock.dailyRouteTechnician;
    school = prismaMock.school;
    async $disconnect() {}
  },
}));

vi.mock("@/lib/supabaseClient", () => ({
  supabase: { auth: { getUser } },
}));

import allOsHandler from "@/pages/api/get-all-os-externas";
import pendingDemandsHandler from "@/pages/api/pending-daily-demands";
import pendingOsHandler from "@/pages/api/dashboard/pending-os";
import dailyDemandsCountHandler from "@/pages/api/dashboard/daily-demands-count";
import { getPendingDailyDemandItems } from "@/utils/pendingDailyDemandOs";

const TODAY = "2026-11-06";
const LEGACY_DAY = "2026-10-01";

const USERS: Record<string, { id: string; profile: any }> = {
  "token-ana": {
    id: "user-ana",
    profile: { id: 10, role: "TECH", displayName: "Ana Souza", schoolId: null },
  },
  "token-carla": {
    id: "user-carla",
    profile: { id: 12, role: "TECH", displayName: "Carla Lima", schoolId: null },
  },
  "token-admin": {
    id: "user-admin",
    profile: { id: 1, role: "ADMIN", displayName: "Admin Geral", schoolId: null },
  },
  "token-admtotal": {
    id: "user-admtotal",
    profile: { id: 2, role: "ADMTOTAL", displayName: "Adm Total", schoolId: null },
  },
};

const PROFILE_NAMES: Record<number, string> = {
  10: "Ana Souza",
  11: "Bruno Alves",
  12: "Carla Lima",
  13: "Diego Prado",
};

const ROUTES = [
  {
    id: 101,
    date: new Date(`${TODAY}T00:00:00.000Z`),
    technicians: [{ technicianId: 10 }, { technicianId: 11 }],
  },
  {
    id: 202,
    date: new Date(`${TODAY}T00:00:00.000Z`),
    technicians: [{ technicianId: 12 }, { technicianId: 13 }],
  },
];

const ROUTE_IDS_BY_TECH: Record<number, number[]> = {
  10: [101],
  11: [101],
  12: [202],
  13: [202],
  1: [],
  2: [],
};

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

function makeReq(token: string | null, query: Record<string, unknown> = {}) {
  return {
    method: "GET",
    query,
    body: {},
    headers: token ? { authorization: `Bearer ${token}` } : {},
  } as any;
}

/** Matcher mínimo do `where` de OSExterna usado pelos endpoints. */
function matchesOsWhere(os: any, where: any): boolean {
  if (!where) return true;

  if (where.status === "Assinado" && os.status !== "Assinado") return false;
  if (where.status === "Pendente" && os.status !== "Pendente") return false;
  if (where.status && typeof where.status === "object" && where.status.not) {
    if (os.status === where.status.not) return false;
  }

  if (where.routeId !== undefined) {
    if (where.routeId === null) {
      if (os.routeId !== null) return false;
    } else if (Array.isArray(where.routeId.in)) {
      if (os.routeId === null || !where.routeId.in.includes(os.routeId)) {
        return false;
      }
    }
  }

  if (where.tecnicoResponsavel?.contains) {
    if (!String(os.tecnicoResponsavel || "").includes(where.tecnicoResponsavel.contains)) {
      return false;
    }
  }

  if (where.data?.notIn && where.data.notIn.includes(os.data)) return false;

  if (where.OR) return where.OR.some((clause: any) => matchesOsWhere(os, clause));

  return true;
}

const OS_ROWS = [
  // Pendentes operacionais
  {
    id: 1,
    numeroOs: "1/2026",
    status: "Pendente",
    routeId: 101,
    data: TODAY,
    tecnicoResponsavel: "Ana Souza",
    unidadeEscolar: "Escola A",
    emailResponsavel: "a@escola",
    createdAt: new Date(`${TODAY}T12:00:00.000Z`),
  },
  {
    id: 2,
    numeroOs: "2/2026",
    status: "Pendente",
    routeId: 202,
    data: TODAY,
    tecnicoResponsavel: "Carla Lima",
    unidadeEscolar: "Escola B",
    emailResponsavel: "b@escola",
    createdAt: new Date(`${TODAY}T12:10:00.000Z`),
  },
  // Dia sem rotas: compatibilidade pelo nome do responsável
  {
    id: 3,
    numeroOs: "3/2026",
    status: "Pendente",
    routeId: null,
    data: LEGACY_DAY,
    tecnicoResponsavel: "Ana Souza",
    unidadeEscolar: "Escola C",
    emailResponsavel: "c@escola",
    createdAt: new Date(`${LEGACY_DAY}T12:00:00.000Z`),
  },
  // Dia com rotas e OS sem equipe: não pertence a nenhuma equipe
  {
    id: 4,
    numeroOs: "4/2026",
    status: "Pendente",
    routeId: null,
    data: TODAY,
    tecnicoResponsavel: "Ana Souza",
    unidadeEscolar: "Escola D",
    emailResponsavel: "d@escola",
    createdAt: new Date(`${TODAY}T12:20:00.000Z`),
  },
  // Histórico de assinadas
  {
    id: 5,
    numeroOs: "5/2026",
    status: "Assinado",
    routeId: 101,
    data: TODAY,
    tecnicoResponsavel: "Ana Souza",
    unidadeEscolar: "Escola A",
    emailResponsavel: "a@escola",
    createdAt: new Date(`${TODAY}T13:00:00.000Z`),
  },
  {
    id: 6,
    numeroOs: "6/2026",
    status: "Assinado",
    routeId: 202,
    data: LEGACY_DAY,
    tecnicoResponsavel: "Ana Souza",
    unidadeEscolar: "Escola B",
    emailResponsavel: "b@escola",
    createdAt: new Date(`${LEGACY_DAY}T13:00:00.000Z`),
  },
];

function wireDefaultMocks() {
  getUser.mockImplementation(async (token: string) => {
    const entry = USERS[token];
    if (!entry) {
      return { data: { user: null }, error: { message: "Token inválido" } };
    }
    return { data: { user: { id: entry.id, email: `${entry.id}@example.com` } }, error: null };
  });

  profileFindUnique.mockImplementation(async ({ where }: any) => {
    const entry = Object.values(USERS).find((user) => user.id === where?.userId);
    return entry ? entry.profile : null;
  });

  profileFindMany.mockImplementation(async ({ where }: any) => {
    const ids: number[] = where?.id?.in || [];
    return ids
      .filter((id) => PROFILE_NAMES[id])
      .map((id) => ({ id, displayName: PROFILE_NAMES[id] }));
  });

  schoolFindMany.mockResolvedValue([]);
  osFindMany.mockResolvedValue([]);
  visitTechnicianFindMany.mockResolvedValue([]);

  dailyRouteTechnicianFindMany.mockImplementation(async ({ where }: any) => {
    const ids = ROUTE_IDS_BY_TECH[where?.technicianId] || [];
    return ids.map((routeId) => ({ routeId }));
  });

  dailyRouteFindMany.mockImplementation(async ({ where }: any) => {
    const wanted = where?.date?.in;
    if (Array.isArray(wanted)) {
      const keys = wanted.map((date: Date) => date.toISOString().slice(0, 10));
      return ROUTES.filter((route) => keys.includes(route.date.toISOString().slice(0, 10)));
    }
    return ROUTES;
  });

  osExternaFindMany.mockImplementation(async ({ where }: any) => {
    return [...OS_ROWS]
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .filter((os) => matchesOsWhere(os, where));
  });

  osExternaCount.mockImplementation(async ({ where }: any) => {
    return OS_ROWS.filter((os) => matchesOsWhere(os, where)).length;
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  wireDefaultMocks();
});

describe("GET /api/get-all-os-externas", () => {
  it("exige autenticação (sem token)", async () => {
    const res = makeRes();
    await allOsHandler(makeReq(null), res);

    expect(res.statusCode).toBe(401);
    expect(osExternaFindMany).not.toHaveBeenCalled();
  });

  it("rejeita token inválido sem consultar OS", async () => {
    const res = makeRes();
    await allOsHandler(makeReq("token-forjado"), res);

    expect(res.statusCode).toBe(401);
    expect(osExternaFindMany).not.toHaveBeenCalled();
  });

  it("técnica da Rota 1 não recebe OS operacional da Rota 2", async () => {
    const res = makeRes();
    await allOsHandler(makeReq("token-ana"), res);

    expect(res.statusCode).toBe(200);
    const ids = res.body.map((os: any) => os.id);
    expect(ids).toEqual([1, 3, 5, 6]);
    expect(ids).not.toContain(2);
    expect(ids).not.toContain(4);
  });

  it("técnica da Rota 2 não recebe OS operacional da Rota 1", async () => {
    const res = makeRes();
    await allOsHandler(makeReq("token-carla"), res);

    const ids = res.body.map((os: any) => os.id);
    expect(ids).toEqual([2]);
    expect(ids).not.toContain(1);
    expect(ids).not.toContain(3);
  });

  it("ADMIN e ADMTOTAL enxergam todas as OS", async () => {
    for (const token of ["token-admin", "token-admtotal"]) {
      osExternaFindMany.mockClear();
      const res = makeRes();
      await allOsHandler(makeReq(token), res);

      const ids = res.body.map((os: any) => os.id).sort((a: number, b: number) => a - b);
      expect(ids).toEqual([1, 2, 3, 4, 5, 6]);
      const whereUsed = osExternaFindMany.mock.calls[0][0].where;
      expect(whereUsed.OR).toBeUndefined();
      expect(whereUsed.routeId).toBeUndefined();
    }
  });

  it("parâmetro userId não altera o escopo do técnico autenticado", async () => {
    const withoutParam = makeRes();
    await allOsHandler(makeReq("token-ana"), withoutParam);

    const withForeignParam = makeRes();
    await allOsHandler(makeReq("token-ana", { userId: "user-carla" }), withForeignParam);

    const withAdminParam = makeRes();
    await allOsHandler(makeReq("token-ana", { userId: "user-admin" }), withAdminParam);

    const ids = (res: any) => res.body.map((os: any) => os.id);
    expect(ids(withForeignParam)).toEqual(ids(withoutParam));
    expect(ids(withAdminParam)).toEqual(ids(withoutParam));
    expect(ids(withForeignParam)).not.toContain(2);

    // A única identidade consultada é a do token.
    const lookedUp = profileFindUnique.mock.calls.map((call: any) => call[0].where.userId);
    expect(new Set(lookedUp)).toEqual(new Set(["user-ana"]));
  });

  it("filtro por status Pendente mantém o escopo da rota", async () => {
    const res = makeRes();
    await allOsHandler(makeReq("token-ana", { status: "Pendente" }), res);

    const ids = res.body.map((os: any) => os.id);
    expect(ids).toEqual([1, 3]);
    expect(ids).not.toContain(2);
    expect(ids).not.toContain(4);
  });
});

describe("GET /api/pending-daily-demands", () => {
  const DEMANDS = [
    {
      id: 1001,
      demand: "Demanda da Rota 1",
      createdAt: new Date(`${TODAY}T09:00:00-03:00`),
      routeId: 101,
      visitStatus: null,
      visitReason: null,
      visitUpdatedBy: null,
      School: { name: "Escola A", address: "Rua A", district: "Centro" },
    },
    {
      id: 1002,
      demand: "Demanda da Rota 2",
      createdAt: new Date(`${TODAY}T09:30:00-03:00`),
      routeId: 202,
      visitStatus: null,
      visitReason: null,
      visitUpdatedBy: null,
      School: { name: "Escola B", address: "Rua B", district: "Centro" },
    },
  ];

  beforeEach(() => {
    schoolDemandFindMany.mockResolvedValue(DEMANDS);
    osExternaFindMany.mockResolvedValue([]);
  });

  it("exige autenticação", async () => {
    const res = makeRes();
    await pendingDemandsHandler(makeReq(null), res);

    expect(res.statusCode).toBe(401);
    expect(schoolDemandFindMany).not.toHaveBeenCalled();
  });

  it("cada equipe vê apenas a demanda da própria rota, com os próprios técnicos", async () => {
    const resAna = makeRes();
    await pendingDemandsHandler(makeReq("token-ana"), resAna);

    expect(resAna.statusCode).toBe(200);
    expect(resAna.body.data.map((item: any) => item.demandId)).toEqual([1001]);
    expect(resAna.body.data[0].responsibleTechnicians).toEqual([
      "Ana Souza",
      "Bruno Alves",
    ]);

    const resCarla = makeRes();
    await pendingDemandsHandler(makeReq("token-carla"), resCarla);

    expect(resCarla.body.data.map((item: any) => item.demandId)).toEqual([1002]);
    expect(resCarla.body.data[0].responsibleTechnicians).toEqual([
      "Carla Lima",
      "Diego Prado",
    ]);
  });

  it("ADMIN vê as duas demandas, cada uma com a equipe da sua rota", async () => {
    const res = makeRes();
    await pendingDemandsHandler(makeReq("token-admin"), res);

    const byId = new Map(res.body.data.map((item: any) => [item.demandId, item]));
    expect(res.body.data).toHaveLength(2);
    expect((byId.get(1001) as any).responsibleTechnicians).toEqual([
      "Ana Souza",
      "Bruno Alves",
    ]);
    expect((byId.get(1002) as any).responsibleTechnicians).toEqual([
      "Carla Lima",
      "Diego Prado",
    ]);
  });

  it("userId na query não troca a identidade autenticada", async () => {
    const res = makeRes();
    await pendingDemandsHandler(
      makeReq("token-ana", { userId: "user-carla" }),
      res
    );

    expect(res.body.data.map((item: any) => item.demandId)).toEqual([1001]);
    // Nenhuma consulta de perfil por userId é feita: o perfil vem do token.
    expect(profileFindUnique.mock.calls.map((call: any) => call[0].where.userId)).toEqual([
      "user-ana",
    ]);
  });

  it("dia sem rotas preserva o comportamento anterior", async () => {
    dailyRouteFindMany.mockResolvedValue([]);
    schoolDemandFindMany.mockResolvedValue([
      {
        id: 2001,
        demand: "Demanda antiga",
        createdAt: new Date(`${LEGACY_DAY}T09:00:00-03:00`),
        routeId: null,
        visitStatus: null,
        visitReason: null,
        visitUpdatedBy: null,
        School: { name: "Escola C", address: "Rua C", district: "Centro" },
      },
    ]);
    visitTechnicianFindMany.mockResolvedValue([
      { technicianId: 10, createdAt: new Date(`${LEGACY_DAY}T09:00:00-03:00`) },
    ]);

    const items = await getPendingDailyDemandItems({
      profile: USERS["token-ana"].profile,
    });

    expect(items).toHaveLength(1);
    expect(items[0].demandId).toBe(2001);
    expect(items[0].responsibleTechnicians).toEqual(["Ana Souza"]);
  });
});

describe("GET /api/dashboard/pending-os", () => {
  beforeEach(() => {
    osExternaFindMany.mockResolvedValue([]);
    schoolDemandFindMany.mockResolvedValue([
      {
        id: 1001,
        demand: "Demanda da Rota 1",
        createdAt: new Date(`${TODAY}T09:00:00-03:00`),
        routeId: 101,
        visitStatus: null,
        visitReason: null,
        visitUpdatedBy: null,
        School: { name: "Escola A", address: "Rua A", district: "Centro" },
      },
      {
        id: 1002,
        demand: "Demanda da Rota 2",
        createdAt: new Date(`${TODAY}T09:30:00-03:00`),
        routeId: 202,
        visitStatus: null,
        visitReason: null,
        visitUpdatedBy: null,
        School: { name: "Escola B", address: "Rua B", district: "Centro" },
      },
    ]);
  });

  it("exige autenticação", async () => {
    const res = makeRes();
    await pendingOsHandler(makeReq(null), res);

    expect(res.statusCode).toBe(401);
    expect(osExternaCount).not.toHaveBeenCalled();
  });

  it("indicador do técnico da Rota 1 conta só OS/demandas da Rota 1", async () => {
    const res = makeRes();
    await pendingOsHandler(makeReq("token-ana"), res);

    expect(res.statusCode).toBe(200);
    expect(res.body.data).toMatchObject({
      pendingOsNew: 2, // OS 1 e OS 3 (legado)
      pendingDailyDemands: 1,
      totalPendingOS: 3,
      scope: "mine",
    });
  });

  it("indicador do técnico da Rota 2 não inclui pendências da Rota 1", async () => {
    const res = makeRes();
    await pendingOsHandler(makeReq("token-carla"), res);

    expect(res.body.data).toMatchObject({
      pendingOsNew: 1, // apenas a OS 2
      pendingDailyDemands: 1,
      totalPendingOS: 2,
      scope: "mine",
    });
  });

  it("indicador do ADMIN conta todas as pendências", async () => {
    const res = makeRes();
    await pendingOsHandler(makeReq("token-admin"), res);

    expect(res.body.data).toMatchObject({
      pendingOsNew: 4,
      pendingDailyDemands: 2,
      totalPendingOS: 6,
      scope: "all",
    });
  });

  it("userId na query não amplia o indicador", async () => {
    const res = makeRes();
    await pendingOsHandler(makeReq("token-ana", { userId: "user-admin" }), res);

    expect(res.body.data.scope).toBe("mine");
    expect(res.body.data.pendingOsNew).toBe(2);
    expect(res.body.data.totalPendingOS).toBe(3);
  });
});

describe("GET /api/dashboard/daily-demands-count", () => {
  const DEMANDS = [
    { id: 1001, routeId: 101, createdAt: new Date(`${TODAY}T09:00:00-03:00`) },
    { id: 1002, routeId: 202, createdAt: new Date(`${TODAY}T09:30:00-03:00`) },
  ];

  function matchesDemandWhere(demand: any, where: any): boolean {
    if (!where) return true;
    if (where.routeId !== undefined) {
      if (where.routeId === null) {
        if (demand.routeId !== null) return false;
      } else if (Array.isArray(where.routeId.in)) {
        if (demand.routeId === null || !where.routeId.in.includes(demand.routeId)) {
          return false;
        }
      }
    }
    if (where.createdAt?.gte && demand.createdAt < where.createdAt.gte) return false;
    if (where.createdAt?.lte && demand.createdAt > where.createdAt.lte) return false;
    if (Array.isArray(where.AND)) {
      for (const clause of where.AND) {
        const range = clause?.NOT?.createdAt;
        if (range && demand.createdAt >= range.gte && demand.createdAt <= range.lte) {
          return false;
        }
      }
    }
    if (where.OR) return where.OR.some((c: any) => matchesDemandWhere(demand, c));
    return true;
  }

  beforeEach(() => {
    schoolDemandCount.mockImplementation(async ({ where }: any) => {
      return DEMANDS.filter((demand) => matchesDemandWhere(demand, where)).length;
    });
  });

  it("exige autenticação", async () => {
    const res = makeRes();
    await dailyDemandsCountHandler(makeReq(null), res);

    expect(res.statusCode).toBe(401);
    expect(schoolDemandCount).not.toHaveBeenCalled();
  });

  it("técnico da Rota 1 conta apenas demandas da própria rota", async () => {
    const res = makeRes();
    await dailyDemandsCountHandler(makeReq("token-ana"), res);

    expect(res.statusCode).toBe(200);
    expect(res.body.data.dailyDemandsCount).toBe(1);
    expect(res.body.data.totalDemandsCount).toBe(1);

    const todayWhere = schoolDemandCount.mock.calls[0][0].where;
    expect(todayWhere.OR).toEqual(
      expect.arrayContaining([{ routeId: { in: [101] } }])
    );
  });

  it("ADMIN conta tudo, sem filtro de rota", async () => {
    const res = makeRes();
    await dailyDemandsCountHandler(makeReq("token-admin"), res);

    expect(res.body.data.dailyDemandsCount).toBe(2);
    expect(res.body.data.totalDemandsCount).toBe(2);

    const totalWhere = schoolDemandCount.mock.calls[1][0].where;
    expect(totalWhere).toEqual({});
  });
});
