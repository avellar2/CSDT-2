import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Integridade demanda -> OS -> rota em save-os-externa.
 *
 * O backend não confia em `context.dailyDemandId`, `context.dailyDemandDate`
 * nem na `data` enviada pelo formulário: recarrega a demanda e confere data
 * operacional e rota do técnico autenticado.
 */

const {
  profileFindUnique,
  profileFindMany,
  schoolDemandFindUnique,
  schoolDemandUpdate,
  osExternaCreate,
  osExternaUpdate,
  dailyRouteCount,
  dailyRouteTechnicianFindMany,
  visitTechnicianFindFirst,
  releaseFindFirst,
  getUser,
  prismaMock,
} = vi.hoisted(() => {
  const mocks = {
    profileFindUnique: vi.fn(),
    profileFindMany: vi.fn(),
    schoolDemandFindUnique: vi.fn(),
    schoolDemandUpdate: vi.fn(),
    osExternaCreate: vi.fn(),
    osExternaUpdate: vi.fn(),
    dailyRouteCount: vi.fn(),
    dailyRouteTechnicianFindMany: vi.fn(),
    visitTechnicianFindFirst: vi.fn(),
    releaseFindFirst: vi.fn(),
    getUser: vi.fn(),
  };

  const prismaMock = {
    profile: { findUnique: mocks.profileFindUnique, findMany: mocks.profileFindMany },
    schoolDemand: {
      findUnique: mocks.schoolDemandFindUnique,
      update: mocks.schoolDemandUpdate,
    },
    oSExterna: { create: mocks.osExternaCreate, update: mocks.osExternaUpdate },
    dailyRoute: { count: mocks.dailyRouteCount },
    dailyRouteTechnician: { findMany: mocks.dailyRouteTechnicianFindMany },
    visitTechnician: { findFirst: mocks.visitTechnicianFindFirst },
    dailyDemandOsRelease: { findFirst: mocks.releaseFindFirst },
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
    oSExterna = prismaMock.oSExterna;
    dailyRoute = prismaMock.dailyRoute;
    dailyRouteTechnician = prismaMock.dailyRouteTechnician;
    visitTechnician = prismaMock.visitTechnician;
    dailyDemandOsRelease = prismaMock.dailyDemandOsRelease;
    async $disconnect() {}
  },
}));

vi.mock("@/lib/supabaseClient", () => ({
  supabase: { auth: { getUser } },
}));

import saveOsExternaHandler from "@/pages/api/save-os-externa";

const DEMAND_DAY = "2026-04-10";
const OTHER_DAY = "2026-04-12";

const TECH = { id: 10, role: "TECH", displayName: "Ana Souza", schoolId: null };
const ADMIN = { id: 1, role: "ADMIN", displayName: "Admin Geral", schoolId: null };

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

function logout() {
  getUser.mockResolvedValue({ data: { user: null }, error: { message: "Token inválido" } });
}

function makeRequest(params: {
  data: string;
  dailyDemandDate: string;
  dailyDemandId?: number | string | null;
  token?: string | null;
}) {
  return {
    method: "POST",
    query: {},
    headers:
      params.token === null
        ? {}
        : { authorization: `Bearer ${params.token || "token-ok"}` },
    body: {
      formData: {
        unidadeEscolar: "Escola A",
        tecnicoResponsavel: "Ana Souza",
        data: params.data,
        hora: "09:00",
        emailResponsavel: "a@escola",
        fotosAntes: [],
        fotosDepois: [],
      },
      context: {
        origin: "daily-demands",
        dailyDemandId: params.dailyDemandId === undefined ? 500 : params.dailyDemandId,
        dailyDemandDate: params.dailyDemandDate,
        userId: "usuario-forjado",
      },
    },
  } as any;
}

beforeEach(() => {
  vi.clearAllMocks();
  loginAs(TECH);
  osExternaCreate.mockResolvedValue({ id: 900 });
  osExternaUpdate.mockResolvedValue({ id: 900, numeroOs: "900/2026" });
  schoolDemandUpdate.mockResolvedValue({});
  dailyRouteCount.mockResolvedValue(1);
  dailyRouteTechnicianFindMany.mockResolvedValue([{ routeId: 55 }]);
  visitTechnicianFindFirst.mockResolvedValue({ id: 1 });
  releaseFindFirst.mockResolvedValue(null);
  profileFindMany.mockResolvedValue([]);
});

describe("POST /api/save-os-externa — vínculo demanda/rota", () => {
  it("rejeita sem token sem consultar demanda", async () => {
    logout();
    const res = makeRes();
    await saveOsExternaHandler(
      makeRequest({ data: DEMAND_DAY, dailyDemandDate: DEMAND_DAY, token: null }),
      res
    );

    expect(res.statusCode).toBe(401);
    expect(schoolDemandFindUnique).not.toHaveBeenCalled();
    expect(osExternaCreate).not.toHaveBeenCalled();
  });

  it("grava a rota da demanda quando a data e a equipe conferem", async () => {
    schoolDemandFindUnique.mockResolvedValue({
      id: 500,
      routeId: 55,
      createdAt: new Date(`${DEMAND_DAY}T12:00:00.000Z`),
    });

    const res = makeRes();
    await saveOsExternaHandler(
      makeRequest({ data: DEMAND_DAY, dailyDemandDate: DEMAND_DAY }),
      res
    );

    expect(res.statusCode).toBe(200);
    expect(osExternaCreate.mock.calls[0][0].data).toMatchObject({
      routeId: 55,
      data: DEMAND_DAY,
    });
  });

  it("não aceita demanda de outro dia", async () => {
    schoolDemandFindUnique.mockResolvedValue({
      id: 500,
      routeId: 55,
      createdAt: new Date("2026-04-11T12:00:00.000Z"),
    });

    const res = makeRes();
    await saveOsExternaHandler(
      makeRequest({ data: DEMAND_DAY, dailyDemandDate: DEMAND_DAY }),
      res
    );

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toContain("pertence a 2026-04-11");
    expect(osExternaCreate).not.toHaveBeenCalled();
  });

  it("não aceita data de OS diferente da data operacional da demanda", async () => {
    schoolDemandFindUnique.mockResolvedValue({
      id: 500,
      routeId: 55,
      createdAt: new Date(`${DEMAND_DAY}T12:00:00.000Z`),
    });

    const res = makeRes();
    await saveOsExternaHandler(
      makeRequest({ data: OTHER_DAY, dailyDemandDate: DEMAND_DAY }),
      res
    );

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toContain("data operacional da demanda");
    expect(osExternaCreate).not.toHaveBeenCalled();
  });

  it("não aceita data de contexto forjada", async () => {
    schoolDemandFindUnique.mockResolvedValue({
      id: 500,
      routeId: 55,
      createdAt: new Date(`${DEMAND_DAY}T12:00:00.000Z`),
    });

    const res = makeRes();
    await saveOsExternaHandler(
      makeRequest({ data: OTHER_DAY, dailyDemandDate: OTHER_DAY }),
      res
    );

    expect(res.statusCode).toBe(400);
    expect(osExternaCreate).not.toHaveBeenCalled();
  });

  it("técnico não usa demanda de outra equipe", async () => {
    schoolDemandFindUnique.mockResolvedValue({
      id: 500,
      routeId: 66,
      createdAt: new Date(`${DEMAND_DAY}T12:00:00.000Z`),
    });

    const res = makeRes();
    await saveOsExternaHandler(
      makeRequest({ data: DEMAND_DAY, dailyDemandDate: DEMAND_DAY }),
      res
    );

    expect(res.statusCode).toBe(403);
    expect(res.body.error).toContain("outra equipe");
    expect(osExternaCreate).not.toHaveBeenCalled();
  });

  it("rejeita demanda inexistente", async () => {
    schoolDemandFindUnique.mockResolvedValue(null);

    const res = makeRes();
    await saveOsExternaHandler(
      makeRequest({ data: DEMAND_DAY, dailyDemandDate: DEMAND_DAY }),
      res
    );

    expect(res.statusCode).toBe(404);
    expect(osExternaCreate).not.toHaveBeenCalled();
  });

  it("exige que a OS sem demanda tenha a data informada", async () => {
    const res = makeRes();
    await saveOsExternaHandler(
      makeRequest({
        data: OTHER_DAY,
        dailyDemandDate: DEMAND_DAY,
        dailyDemandId: null,
      }),
      res
    );

    expect(res.statusCode).toBe(400);
    expect(osExternaCreate).not.toHaveBeenCalled();
  });

  it("ADMIN pode lançar OS para demanda de qualquer equipe, mantendo a rota", async () => {
    loginAs(ADMIN);
    schoolDemandFindUnique.mockResolvedValue({
      id: 500,
      routeId: 66,
      createdAt: new Date(`${DEMAND_DAY}T12:00:00.000Z`),
    });

    const res = makeRes();
    await saveOsExternaHandler(
      makeRequest({ data: DEMAND_DAY, dailyDemandDate: DEMAND_DAY }),
      res
    );

    expect(res.statusCode).toBe(200);
    expect(osExternaCreate.mock.calls[0][0].data.routeId).toBe(66);
  });
});
