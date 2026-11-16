import { beforeEach, describe, expect, it, vi } from "vitest";
import fs from "fs";
import path from "path";

const { dailyRouteFindUnique } = vi.hoisted(() => ({
  dailyRouteFindUnique: vi.fn(),
}));

vi.mock("@/utils/prisma", () => ({
  default: {
    dailyRoute: { findUnique: dailyRouteFindUnique },
  },
}));

import {
  assertCanManageRoute,
  assertCanReadOptimization,
  assertOptimizationEditable,
  buildStartLocation,
  buildVisitRows,
  canSavePlans,
  readMeta,
  resolveTechnicianId,
} from "@/utils/routePlanner/persistence";
import type { PlanResult } from "@/utils/routePlanner/types";

const readSrc = (rel: string) => fs.readFileSync(path.join(process.cwd(), rel), "utf8");

const authAs = (role: string, profileId = 10) => ({
  id: "supabase-user-id",
  email: "user@example.com",
  profile: { id: profileId, role, displayName: "Fulano", schoolId: null },
});

const planFixture: PlanResult = {
  stops: [
    {
      schoolId: 7,
      name: "Escola Alfa",
      address: "Rua A",
      district: "1",
      latitude: -22.78,
      longitude: -43.31,
      priority: true,
      order: 1,
      legDistanceMeters: 5400,
      legDurationSeconds: 600,
      arrivalTime: "2026-11-16T08:10:00-03:00",
      departureTime: "2026-11-16T08:40:00-03:00",
      serviceMinutes: 30,
    },
    {
      schoolId: 9,
      name: "Escola Beta",
      address: "Rua B",
      district: "2",
      latitude: -22.79,
      longitude: -43.32,
      priority: false,
      order: 2,
      legDistanceMeters: 2100,
      legDurationSeconds: 300,
      arrivalTime: "2026-11-16T08:45:00-03:00",
      departureTime: "2026-11-16T09:15:00-03:00",
      serviceMinutes: 30,
    },
  ],
  geometry: [
    [-22.78, -43.31],
    [-22.79, -43.32],
  ],
  totals: {
    distanceMeters: 7500,
    drivingSeconds: 900,
    serviceMinutes: 60,
    totalMinutes: 75,
    returnMinutes: 0,
  },
  algorithm: "exact",
  provider: "osrm",
  approximate: false,
  start: { lat: -22.789, lng: -43.309, name: "CSDT" },
  returnToStart: false,
  serviceMinutes: 30,
  startTime: "08:00",
  dateKey: "2026-11-16",
  excluded: [{ schoolId: 5, name: "Sem coords", reason: "Sem latitude/longitude cadastradas." }],
  warnings: [],
};

describe("Persistência — somente após confirmação", () => {
  it("a pré-visualização não grava nada no banco", () => {
    const src = readSrc("src/pages/api/routes/optimize.ts");

    expect(src).not.toMatch(/prisma\./);
    expect(src).not.toContain("routeOptimization.create");
    expect(src).not.toContain("routeVisit.create");
    expect(src).toContain("createPlanner");
  });

  it("a gravação fica no endpoint de confirmação", () => {
    const src = readSrc("src/pages/api/routes/optimizations/index.ts");
    expect(src).toContain("routeOptimization.create");
    expect(src).toContain("planFixedOrder");
  });

  it("mapeia as paradas para RouteVisit com ordem, distância e horários", () => {
    const rows = buildVisitRows(planFixture);

    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({
      schoolId: 7,
      visitOrder: 1,
      distance: 5400,
      estimatedTime: 30,
      status: "PENDING",
    });
    expect(rows[0].arrivalTime.toISOString()).toBe("2026-11-16T11:10:00.000Z");
  });

  it("guarda os metadados no JSON sem criar colunas novas", () => {
    const meta = buildStartLocation(planFixture, {
      dailyRouteId: 3,
      savedBy: "supabase-user-id",
      prioritySchoolIds: [7],
    }) as Record<string, unknown>;

    expect(meta.dailyRouteId).toBe(3);
    expect(meta.serviceMinutes).toBe(30);
    expect(meta.returnToStart).toBe(false);
    expect(meta.approximate).toBe(false);
    expect(meta.prioritySchoolIds).toEqual([7]);

    const roundTrip = readMeta({ startLocation: meta as never });
    expect(roundTrip?.dailyRouteId).toBe(3);
    expect(roundTrip?.excluded).toHaveLength(1);
    expect(roundTrip?.geometry).toHaveLength(2);
  });
});

describe("Persistência — proteção por equipe", () => {
  beforeEach(() => {
    dailyRouteFindUnique.mockReset();
  });

  it("gestor pode operar qualquer rota existente", async () => {
    dailyRouteFindUnique.mockResolvedValue({
      id: 3,
      status: "PLANNED",
      technicians: [{ technicianId: 10 }],
    });

    const access = await assertCanManageRoute(authAs("ADMIN"), 3);
    expect(access?.dailyRouteId).toBe(3);
  });

  it("técnico da equipe pode salvar a própria rota", async () => {
    dailyRouteFindUnique.mockResolvedValue({
      id: 3,
      status: "PLANNED",
      technicians: [{ technicianId: 10 }, { technicianId: 11 }],
    });

    const access = await assertCanManageRoute(authAs("TECH", 10), 3);
    expect(access?.technicianIds).toEqual([10, 11]);
  });

  it("técnico de outra equipe é bloqueado", async () => {
    dailyRouteFindUnique.mockResolvedValue({
      id: 3,
      status: "PLANNED",
      technicians: [{ technicianId: 99 }],
    });

    await expect(assertCanManageRoute(authAs("TECH", 10), 3)).rejects.toMatchObject({
      code: "FORBIDDEN",
      statusCode: 403,
    });
  });

  it("técnico não salva rota sem vínculo operacional", async () => {
    await expect(assertCanManageRoute(authAs("TECH", 10), null)).rejects.toMatchObject({
      code: "ROUTE_REQUIRED",
    });
    expect(dailyRouteFindUnique).not.toHaveBeenCalled();
  });

  it("perfis somente leitura e escola não salvam rotas", async () => {
    await expect(assertCanManageRoute(authAs("ONLYREAD"), null)).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
    await expect(assertCanManageRoute(authAs("SCHOOL"), null)).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
    expect(canSavePlans("ONLYREAD")).toBe(false);
    expect(canSavePlans("SCHOOL")).toBe(false);
    expect(canSavePlans("TECH")).toBe(true);
    expect(canSavePlans("ADMTOTAL")).toBe(true);
  });

  it("técnico não lê rota de outra equipe", async () => {
    await expect(
      assertCanReadOptimization(authAs("TECH", 10), {
        technicianId: 99,
        startLocation: null,
      })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("gestor lê qualquer rota", async () => {
    await expect(
      assertCanReadOptimization(authAs("ADMIN", 10), {
        technicianId: 99,
        startLocation: null,
      })
    ).resolves.toBeUndefined();
  });

  it("rota encerrada não pode ser recalculada", () => {
    expect(() => assertOptimizationEditable({ status: "COMPLETED" })).toThrowError(
      /encerrada/i
    );
    expect(() => assertOptimizationEditable({ status: "CANCELLED" })).toThrowError();
    expect(() => assertOptimizationEditable({ status: "PLANNED" })).not.toThrow();
  });

  it("o dono do registro é escolhido no servidor, não pelo cliente", () => {
    expect(
      resolveTechnicianId(authAs("TECH", 10), {
        dailyRouteId: 3,
        technicianIds: [12, 13],
        status: "PLANNED",
      })
    ).toBe(12);

    expect(
      resolveTechnicianId(authAs("ADMIN", 42), {
        dailyRouteId: 3,
        technicianIds: [],
        status: "PLANNED",
      })
    ).toBe(42);
  });
});

describe("Segurança das APIs de mapa e rota", () => {
  const files = [
    "src/pages/api/schools-with-coordinates.ts",
    "src/pages/api/all-schools.ts",
    "src/pages/api/get-school.ts",
    "src/pages/api/geocode-schools.ts",
    "src/pages/api/geocode-next-school.ts",
    "src/pages/api/update-school-address.ts",
    "src/pages/api/routes/optimize.ts",
    "src/pages/api/routes/optimizations/index.ts",
    "src/pages/api/routes/optimizations/[id].ts",
    "src/pages/api/routes/geo-quality.ts",
    "src/pages/api/routes/[id]/stops.ts",
  ];

  it("exige autenticação de fato (requireAuth não fica depois do return 405)", () => {
    for (const file of files) {
      const src = readSrc(file);

      expect(src, `${file} não chama requireAuth`).toContain(
        "await requireAuth(req, res)"
      );
      expect(src, `${file} não interrompe sem auth`).toContain("if (!auth) return");

      // O bug original era `return res.status(405)` seguido de requireAuth
      // dentro do mesmo bloco — o auth nunca executava.
      const lines = src.split("\n");
      const methodIndex = lines.findIndex((line) => line.includes("res.status(405)"));

      if (methodIndex !== -1) {
        // O return 405 precisa ser a última instrução do bloco: a linha
        // seguinte tem de fechar o `if`.
        expect(
          lines[methodIndex + 1]?.trim(),
          `${file}: requireAuth está inalcançável após o return 405`
        ).toBe("}");
      }
    }
  });

  it("não usa técnico fixo em nenhum fluxo de rota", () => {
    for (const file of [...files, "src/pages/route-optimizer.tsx"]) {
      expect(readSrc(file), `${file} usa technicianId fixo`).not.toMatch(
        /technicianId\s*:\s*1\b/
      );
    }
  });

  it("alteração de coordenadas é restrita a ADMIN/ADMTOTAL", () => {
    const src = readSrc("src/pages/api/update-school-address.ts");
    expect(src).toContain("isRouteManager");
    expect(src).toContain("Somente ADMIN ou ADMTOTAL");
  });

  it("geocodificação em massa exige gestor e tem limite por chamada", () => {
    const src = readSrc("src/pages/api/geocode-schools.ts");
    expect(src).toContain("isRouteManager");
    expect(src).toContain("MAX_BATCH");
    expect(src).toContain("setTimeout");
  });

  it("geocode-next não marca escola como geocodificada sem coordenadas", () => {
    const src = readSrc("src/pages/api/geocode-next-school.ts");
    expect(src).not.toMatch(/data:\s*\{\s*geocoded:\s*true\s*\}/);
    expect(src).toContain("skipIds");
  });

  it("otimização valida a participação do técnico na rota operacional", () => {
    const src = readSrc("src/pages/api/routes/optimize.ts");
    expect(src).toContain("loadRouteAccess");
    expect(src).toContain("Você não participa desta rota");
  });

  it("salvamento revalida a ordem no servidor (não confia no cliente)", () => {
    const src = readSrc("src/pages/api/routes/optimizations/index.ts");
    expect(src).toContain("planFixedOrder");
    expect(src).toContain("assertCanManageRoute");
    expect(src).toContain("ROUTE_HAS_PROGRESS");
  });

  it("rotas de outras equipes não podem ser sobrescritas por listagem", () => {
    const src = readSrc("src/pages/api/routes/optimizations/index.ts");
    // Só substitui o rascunho da mesma rota operacional (e, sem rota, do
    // mesmo autor).
    expect(src).toContain("meta?.dailyRouteId !== dailyRouteId");
    expect(src).toContain("meta.savedBy !== auth.id");
    expect(src).toContain("isRouteManager");
    expect(src).toContain("dailyRouteFilter");
  });

  it("endpoint de paradas da rota operacional é somente leitura", () => {
    const src = readSrc("src/pages/api/routes/[id]/stops.ts");
    expect(src).toContain('req.method !== "GET"');
    expect(src).not.toContain("prisma.dailyRoute.update");
    expect(src).not.toContain("prisma.schoolDemand.update");
  });
});

describe("Compatibilidade com as rotas operacionais existentes", () => {
  it("não altera o schema de rotas (nenhuma migration nova destrutiva)", () => {
    const schema = readSrc("prisma/schema.prisma");
    expect(schema).toContain("model DailyRoute");
    expect(schema).toContain("model DailyRouteTechnician");
    expect(schema).toContain("model RouteOptimization");
    expect(schema).toContain("model RouteVisit");
  });

  it("a UI reutiliza a API de rotas operacionais em vez de recriá-la", () => {
    const src = readSrc("src/pages/route-optimizer.tsx");
    expect(src).toContain("/api/routes?date=");
    expect(src).toContain("/api/routes/${dailyRouteId}/stops");
    expect(src).toContain("/api/routes/optimize");
    expect(src).toContain("/api/routes/optimizations");
  });

  it("rotas rápidas deixaram de ordenar por distrito", () => {
    const src = readSrc("src/components/QuickRoutes.tsx");
    expect(src).not.toContain("Rota otimizada por distrito");
    expect(src).not.toMatch(/district\.localeCompare/);
    expect(src).toContain("/api/routes/optimize");
  });
});
