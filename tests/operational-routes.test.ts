import { beforeEach, describe, expect, it, vi } from "vitest";
import fs from "fs";
import path from "path";

const { dailyRouteTechnicianFindMany, dailyRouteCount, dailyRouteFindMany } =
  vi.hoisted(() => ({
    dailyRouteTechnicianFindMany: vi.fn(),
    dailyRouteCount: vi.fn(),
    dailyRouteFindMany: vi.fn(),
  }));

vi.mock("@/utils/prisma", () => ({
  default: {
    dailyRouteTechnician: { findMany: dailyRouteTechnicianFindMany },
    dailyRoute: {
      count: dailyRouteCount,
      findMany: dailyRouteFindMany,
    },
  },
}));

import {
  buildRouteConflictKey,
  canProfileAccessDemand,
  canTechnicianSeeRouteEntity,
  dateKeyFromPrismaDate,
  isRouteManager,
  isValidDateKey,
  loadRouteScope,
  prismaDateFromKey,
  prismaDateTimeFromDateKey,
  routeStatusIsOpen,
  type RouteScopeEntry,
} from "@/utils/operationalRoutes";

const readSrc = (rel: string) =>
  fs.readFileSync(path.join(process.cwd(), rel), "utf8");

describe("Rotas operacionais — helpers puros", () => {
  it("identifica gestores de rota (ADMIN/ADMTOTAL)", () => {
    expect(isRouteManager("ADMIN")).toBe(true);
    expect(isRouteManager("ADMTOTAL")).toBe(true);
    expect(isRouteManager("TECH")).toBe(false);
    expect(isRouteManager("ONLYREAD")).toBe(false);
    expect(isRouteManager("SCHOOL")).toBe(false);
  });

  it("só considera rotas abertas PLANNED e IN_PROGRESS", () => {
    expect(routeStatusIsOpen("PLANNED")).toBe(true);
    expect(routeStatusIsOpen("IN_PROGRESS")).toBe(true);
    expect(routeStatusIsOpen("COMPLETED")).toBe(false);
    expect(routeStatusIsOpen("CANCELLED")).toBe(false);
  });

  it("valida chave de data YYYY-MM-DD", () => {
    expect(isValidDateKey("2026-11-06")).toBe(true);
    expect(isValidDateKey("06/11/2026")).toBe(false);
    expect(isValidDateKey(undefined)).toBe(false);
    expect(isValidDateKey(20261106)).toBe(false);
  });

  it("lê coluna @db.Date sem deslocamento de fuso", () => {
    expect(dateKeyFromPrismaDate(new Date("2026-11-06T00:00:00.000Z"))).toBe(
      "2026-11-06"
    );
    expect(prismaDateFromKey("2026-11-06").toISOString()).toBe(
      "2026-11-06T00:00:00.000Z"
    );
  });

  it("usa meio-dia de America/Sao_Paulo para colunas DateTime do dia", () => {
    const value = prismaDateTimeFromDateKey("2026-11-06");
    expect(value.toISOString()).toBe("2026-11-06T15:00:00.000Z");
  });

  it("gera chave única de conflito técnico/dia", () => {
    expect(buildRouteConflictKey(12, "2026-11-06")).toBe("12:2026-11-06");
  });
});

describe("Visibilidade por rota (canTechnicianSeeRouteEntity)", () => {
  const scopeWithRoutes = new Map<string, RouteScopeEntry[]>([
    [
      "2026-11-06",
      [
        { id: 1, technicianIds: [10, 11] },
        { id: 2, technicianIds: [12, 13] },
      ],
    ],
  ]);

  it("dia sem rotas: comportamento tradicional preservado (visível)", () => {
    expect(
      canTechnicianSeeRouteEntity({
        scope: new Map(),
        dateKey: "2026-11-06",
        routeId: null,
        profileId: 99,
      })
    ).toBe(true);
  });

  it("técnico da Rota 1 enxerga demanda da Rota 1", () => {
    expect(
      canTechnicianSeeRouteEntity({
        scope: scopeWithRoutes,
        dateKey: "2026-11-06",
        routeId: 1,
        profileId: 10,
      })
    ).toBe(true);
  });

  it("técnico da Rota 1 NÃO enxerga demanda da Rota 2", () => {
    expect(
      canTechnicianSeeRouteEntity({
        scope: scopeWithRoutes,
        dateKey: "2026-11-06",
        routeId: 2,
        profileId: 10,
      })
    ).toBe(false);
  });

  it("com rotas no dia, demanda sem rota fica oculta ao técnico", () => {
    expect(
      canTechnicianSeeRouteEntity({
        scope: scopeWithRoutes,
        dateKey: "2026-11-06",
        routeId: null,
        profileId: 10,
      })
    ).toBe(false);
  });
});

describe("canProfileAccessDemand", () => {
  const createdAt = new Date("2026-11-06T12:00:00-03:00");

  beforeEach(() => {
    dailyRouteTechnicianFindMany.mockReset();
    dailyRouteCount.mockReset();
  });

  it("gestor acessa qualquer demanda sem consultar rotas", async () => {
    const allowed = await canProfileAccessDemand({
      profileId: 5,
      role: "ADMIN",
      demandId: 1,
      demandCreatedAt: createdAt,
      demandRouteId: 2,
    });

    expect(allowed).toBe(true);
    expect(dailyRouteTechnicianFindMany).not.toHaveBeenCalled();
  });

  it("técnico acessa demanda da própria rota", async () => {
    dailyRouteTechnicianFindMany.mockResolvedValue([{ routeId: 1 }]);

    const allowed = await canProfileAccessDemand({
      profileId: 10,
      role: "TECH",
      demandId: 1,
      demandCreatedAt: createdAt,
      demandRouteId: 1,
    });

    expect(allowed).toBe(true);
  });

  it("técnico NÃO acessa demanda de outra rota", async () => {
    dailyRouteTechnicianFindMany.mockResolvedValue([{ routeId: 1 }]);

    const allowed = await canProfileAccessDemand({
      profileId: 10,
      role: "TECH",
      demandId: 1,
      demandCreatedAt: createdAt,
      demandRouteId: 2,
    });

    expect(allowed).toBe(false);
  });

  it("com rotas no dia, técnico sem rota não acessa demanda sem rota", async () => {
    dailyRouteTechnicianFindMany.mockResolvedValue([]);
    dailyRouteCount.mockResolvedValue(2);

    const allowed = await canProfileAccessDemand({
      profileId: 10,
      role: "TECH",
      demandId: 1,
      demandCreatedAt: createdAt,
      demandRouteId: null,
    });

    expect(allowed).toBe(false);
  });

  it("sem rotas no dia, técnico mantém o acesso tradicional", async () => {
    dailyRouteTechnicianFindMany.mockResolvedValue([]);
    dailyRouteCount.mockResolvedValue(0);

    const allowed = await canProfileAccessDemand({
      profileId: 10,
      role: "TECH",
      demandId: 1,
      demandCreatedAt: createdAt,
      demandRouteId: null,
    });

    expect(allowed).toBe(true);
  });
});

describe("loadRouteScope", () => {
  beforeEach(() => {
    dailyRouteFindMany.mockReset();
  });

  it("agrupa rotas por data com seus técnicos ativos", async () => {
    dailyRouteFindMany.mockResolvedValue([
      {
        id: 1,
        date: new Date("2026-11-06T00:00:00.000Z"),
        technicians: [{ technicianId: 10 }, { technicianId: 11 }],
      },
      {
        id: 2,
        date: new Date("2026-11-06T00:00:00.000Z"),
        technicians: [{ technicianId: 12 }],
      },
    ]);

    const scope = await loadRouteScope(["2026-11-06", "2026-11-06"]);

    expect(scope.get("2026-11-06")).toEqual([
      { id: 1, technicianIds: [10, 11] },
      { id: 2, technicianIds: [12] },
    ]);
    // datas duplicadas são consultadas uma única vez
    expect(dailyRouteFindMany).toHaveBeenCalledTimes(1);
    const arg = dailyRouteFindMany.mock.calls[0][0];
    expect(arg.where.date.in).toHaveLength(1);
  });

  it("não consulta o banco quando não há datas", async () => {
    const scope = await loadRouteScope([]);
    expect(scope.size).toBe(0);
    expect(dailyRouteFindMany).not.toHaveBeenCalled();
  });
});

describe("Separação aplicada no backend", () => {
  it("daily-demands valida a autenticação antes de consultar dados", () => {
    const src = readSrc("src/pages/api/daily-demands.ts");
    const authIndex = src.indexOf("await requireAuth(req, res)");
    const queryIndex = src.indexOf("prisma.schoolDemand.findMany");

    expect(authIndex).toBeGreaterThan(-1);
    expect(queryIndex).toBeGreaterThan(-1);
    expect(authIndex).toBeLessThan(queryIndex);

    // Técnico é filtrado no backend, não apenas no React.
    expect(src).toContain("visibleRouteIdsByDate");
    expect(src).toContain("demand.routeId !== null && visibleRouteIds.includes(demand.routeId)");
  });

  it("os-availability não confia em userId vindo do frontend", () => {
    const src = readSrc("src/pages/api/daily-demands/os-availability.ts");
    expect(src).not.toMatch(/req\.query\.userId/);
    expect(src).toContain("requireAuth");
  });

  it("assign registra auditoria usando o usuário autenticado", () => {
    const src = readSrc("src/pages/api/routes/assign.ts");
    expect(src).toContain("isRouteManager");
    expect(src).toContain("movedBy: auth.id");
  });

  it("transferência de chamado em chamados-escalas exige gestor", () => {
    const src = readSrc("src/pages/api/chamados-escalas.ts");
    expect(src).toContain("isRouteManager(auth.profile.role)");
    expect(src).toContain("Somente ADMIN ou ADMTOTAL podem transferir chamados entre rotas");
  });
});

describe("Migration aditiva e idempotente", () => {
  const migration = readSrc(
    "prisma/migrations/20261106120000_add_operational_daily_routes/migration.sql"
  );

  it("não remove nem recria tabelas ou colunas existentes", () => {
    expect(migration).not.toMatch(/DROP\s+TABLE/i);
    expect(migration).not.toMatch(/DROP\s+COLUMN/i);
    expect(migration).not.toMatch(/TRUNCATE/i);
  });

  it("usa criação condicional (IF NOT EXISTS)", () => {
    expect(migration).toMatch(/IF NOT EXISTS/);
  });
});
