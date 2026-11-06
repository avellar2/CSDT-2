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
  buildTechnicianTicketWhere,
  canProfileAccessDemand,
  canTechnicianSeeRouteEntity,
  dateKeyFromPrismaDate,
  isRouteManager,
  isValidDateKey,
  loadRouteScope,
  loadTicketAccessContext,
  prismaDateFromKey,
  prismaDateTimeFromDateKey,
  routeStatusIsOpen,
  technicianCanAccessTicket,
  ticketDateKey,
  type RouteScopeEntry,
  type TicketAccessContext,
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

describe("Acesso a chamados técnicos por rota (Problems A/B/C)", () => {
  // Carro X = rota 1 (técnicos 10 e 11); Carro Y = rota 2 (técnicos 12 e 13).
  const dayWithRoutes = "2026-11-06";
  const techCarX: TicketAccessContext = {
    routeIds: [1],
    daysWithRoutes: [dayWithRoutes],
  };
  const techCarY: TicketAccessContext = {
    routeIds: [2],
    daysWithRoutes: [dayWithRoutes],
  };
  const techWithoutRoute: TicketAccessContext = {
    routeIds: [],
    daysWithRoutes: [dayWithRoutes],
  };
  const legacyContext: TicketAccessContext = { routeIds: [], daysWithRoutes: [] };

  const at = (dateKey: string) => new Date(`${dateKey}T12:00:00-03:00`);

  it("mantém as equipes de carros diferentes totalmente separadas", () => {
    const ticketCarX = { routeId: 1, scheduledDate: at(dayWithRoutes) };
    const ticketCarY = { routeId: 2, scheduledDate: at(dayWithRoutes) };

    expect(technicianCanAccessTicket(techCarX, ticketCarX)).toBe(true);
    expect(technicianCanAccessTicket(techCarX, ticketCarY)).toBe(false);
    expect(technicianCanAccessTicket(techCarY, ticketCarY)).toBe(true);
    expect(technicianCanAccessTicket(techCarY, ticketCarX)).toBe(false);
  });

  it("com rotas no dia, chamado sem rota é fila administrativa (oculto)", () => {
    expect(
      technicianCanAccessTicket(techCarX, {
        routeId: null,
        scheduledDate: at(dayWithRoutes),
      })
    ).toBe(false);
  });

  it("chamado sem rota e sem data continua na fila técnica", () => {
    expect(
      technicianCanAccessTicket(techWithoutRoute, {
        routeId: null,
        scheduledDate: null,
      })
    ).toBe(true);
  });

  it("chamado sem data vinculado a outra rota fica oculto", () => {
    expect(
      technicianCanAccessTicket(techCarX, { routeId: 2, scheduledDate: null })
    ).toBe(false);
  });

  it("chamado antigo em dia SEM rotas continua visível (Problem B)", () => {
    // Rota criada hoje não pode esconder chamados de dias anteriores.
    expect(
      technicianCanAccessTicket(techCarX, {
        routeId: null,
        scheduledDate: at("2026-10-01"),
      })
    ).toBe(true);
  });

  it("chamado antigo sem rota continua visível mesmo havendo rotas hoje (Problem B)", () => {
    expect(
      technicianCanAccessTicket(techWithoutRoute, {
        routeId: null,
        scheduledDate: at("2026-10-01"),
      })
    ).toBe(true);
  });

  it("sem nenhuma rota no sistema, qualquer chamado segue o comportamento antigo", () => {
    expect(
      technicianCanAccessTicket(legacyContext, {
        routeId: null,
        scheduledDate: at(dayWithRoutes),
      })
    ).toBe(true);
    expect(
      technicianCanAccessTicket(legacyContext, {
        routeId: null,
        scheduledDate: null,
      })
    ).toBe(true);
  });

  it("ticketDateKey usa a data operacional em America/Sao_Paulo", () => {
    // 02:00 UTC de 07/11 ainda é 06/11 em São Paulo.
    expect(ticketDateKey(new Date("2026-11-07T02:00:00.000Z"))).toBe("2026-11-06");
    expect(ticketDateKey(null)).toBeNull();
  });
});

describe("buildTechnicianTicketWhere", () => {
  const context: TicketAccessContext = {
    routeIds: [1, 2],
    daysWithRoutes: ["2026-11-06"],
  };

  it("inclui as rotas do técnico", () => {
    const where = buildTechnicianTicketWhere(context);
    expect(where.OR).toContainEqual({ routeId: { in: [1, 2] } });
  });

  it("inclui chamados sem rota e sem data", () => {
    const where = buildTechnicianTicketWhere(context);
    expect(where.OR).toContainEqual({ routeId: null, scheduledDate: null });
  });

  it("inclui chamados agendados fora dos dias que possuem rotas", () => {
    const where = buildTechnicianTicketWhere(context);
    const legacy = (where.OR as any[]).find(
      (condition) => condition.scheduledDate && condition.AND
    );

    expect(legacy).toBeTruthy();
    expect(legacy.scheduledDate).toEqual({ not: null });
    expect(legacy.AND).toHaveLength(1);
    const range = legacy.AND[0].NOT.scheduledDate;
    expect(range.gte.toISOString()).toBe("2026-11-06T03:00:00.000Z");
    expect(range.lte.toISOString()).toBe("2026-11-07T02:59:59.999Z");
  });

  it("sem rotas no sistema, não restringe chamados agendados", () => {
    const where = buildTechnicianTicketWhere({
      routeIds: [],
      daysWithRoutes: [],
    });
    expect(where.OR).toHaveLength(2);
    expect(where.OR).toContainEqual({ scheduledDate: { not: null } });
  });
});

describe("loadTicketAccessContext", () => {
  beforeEach(() => {
    dailyRouteTechnicianFindMany.mockReset();
    dailyRouteFindMany.mockReset();
  });

  it("deduplica rotas e datas e ignora rotas canceladas", async () => {
    dailyRouteTechnicianFindMany.mockResolvedValue([
      { routeId: 1 },
      { routeId: 1 },
      { routeId: 2 },
    ]);
    dailyRouteFindMany.mockResolvedValue([
      { date: new Date("2026-11-06T00:00:00.000Z") },
      { date: new Date("2026-11-06T00:00:00.000Z") },
      { date: new Date("2026-11-07T00:00:00.000Z") },
    ]);

    const context = await loadTicketAccessContext(10);

    expect(context).toEqual({
      routeIds: [1, 2],
      daysWithRoutes: ["2026-11-06", "2026-11-07"],
    });
    // rotas canceladas ficam fora do escopo
    const membershipWhere = dailyRouteTechnicianFindMany.mock.calls[0][0].where;
    expect(membershipWhere.technicianId).toBe(10);
    expect(membershipWhere.active).toBe(true);
    expect(membershipWhere.route.status.notIn).toContain("CANCELLED");
  });
});

describe("Regressões dos problemas A, B e C", () => {
  it("Problem C — listagem trata `unassigned` antes de converter para número", () => {
    const src = readSrc("src/pages/api/technical-tickets/list.ts");
    // a conversão numérica não pode receber o literal "unassigned"
    expect(src).not.toMatch(/parseInt\(\s*routeId/);
    expect(src).toContain("routeIdQuery === 'unassigned'");
    expect(src).toContain("Number.isInteger(parsedRouteId)");
  });

  it("Problem B — listagem decide acesso pela data de cada chamado, não por rota global", () => {
    const src = readSrc("src/pages/api/technical-tickets/list.ts");
    expect(src).toContain("loadTicketAccessContext");
    expect(src).toContain("buildTechnicianTicketWhere");
    // não pode voltar a usar a checagem global de rotas
    expect(src).not.toMatch(/dailyRoute\.count/);
    expect(src).not.toContain("hasRoutesForDate");
  });

  it("Problem A — agendamento valida rota e chamado do técnico autenticado", () => {
    const src = readSrc("src/pages/api/technical-tickets/schedule.ts");
    expect(src).toContain("await requireAuth(req, res)");
    expect(src).toContain("technicianCanAccessTicket");
    expect(src).toContain("access.routeIds.includes(parsedRouteId)");
    expect(src).toContain("Somente ADMIN ou ADMTOTAL podem remover o chamado da rota");
    expect(src).toContain("Somente técnicos e administradores podem agendar chamados");
    // transferência de rota só para gestores
    expect(src).toContain("isRouteManager(auth.profile.role)");
  });

  it("Problem A — atualização e exclusão usam a mesma regra por chamado", () => {
    for (const file of [
      "src/pages/api/technical-tickets/update.ts",
      "src/pages/api/technical-tickets/delete.ts",
    ]) {
      const src = readSrc(file);
      expect(src).toContain("loadTicketAccessContext");
      expect(src).toContain("technicianCanAccessTicket");
    }
  });

  it("Problem A — remarcar para outra data com rota exige gestor", () => {
    const src = readSrc("src/pages/api/technical-tickets/update.ts");
    expect(src).toContain("Somente ADMIN ou ADMTOTAL podem reagendar");
  });

  it("Problem D — chamados-escalas limpa vínculo de rota ao reagendar para outro dia", () => {
    const src = readSrc("src/pages/api/chamados-escalas.ts");
    expect(src).toContain("updateData.routeId = null");
    expect(src).toContain("dateKeyFromPrismaDate(currentRoute.date) !== newDateKey");
  });

  it("Problem A — PATCH de chamado de escala bloqueia reagendamento com rota para técnico", () => {
    const src = readSrc("src/pages/api/chamados-escala/[id].ts");
    expect(src).toContain("Somente ADMIN ou ADMTOTAL podem reagendar");
    expect(src).toContain("Apenas a administração pode alterar a rota do chamado");
  });

  it("Problem D — desvincular chamado da rota exige gestor e é auditado", () => {
    const src = readSrc("src/pages/api/technical-tickets/update.ts");
    expect(src).toContain("hasOwnProperty.call");
    expect(src).toContain("updateData.routeId = null");
    expect(src).toContain("fromRouteId: currentTicket.routeId");
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
