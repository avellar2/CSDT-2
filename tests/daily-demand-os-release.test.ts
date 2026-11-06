import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Homologação da liberação de OS após as 17h (America/Sao_Paulo), incluindo a
 * separação por rota operacional na data da demanda.
 */
const {
  profileFindUnique,
  dailyRouteCount,
  membershipFindMany,
  demandFindUnique,
  visitFindFirst,
  releaseFindFirst,
} = vi.hoisted(() => ({
  profileFindUnique: vi.fn(),
  dailyRouteCount: vi.fn(),
  membershipFindMany: vi.fn(),
  demandFindUnique: vi.fn(),
  visitFindFirst: vi.fn(),
  releaseFindFirst: vi.fn(),
}));

vi.mock("@/utils/prisma", () => ({
  default: {
    profile: { findUnique: profileFindUnique },
    dailyRoute: { count: dailyRouteCount },
    dailyRouteTechnician: { findMany: membershipFindMany },
    schoolDemand: { findUnique: demandFindUnique },
    visitTechnician: { findFirst: visitFindFirst },
    dailyDemandOsRelease: { findFirst: releaseFindFirst },
  },
}));

import { assessDailyDemandOsAvailability } from "@/utils/dailyDemandOsRules";

const demandDate = "2026-11-06";

function techProfile(id = 10, role = "TECH") {
  return { id, displayName: "Técnico", role };
}

describe("assessDailyDemandOsAvailability", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    profileFindUnique.mockResolvedValue(techProfile());
    dailyRouteCount.mockResolvedValue(0);
    membershipFindMany.mockResolvedValue([]);
    visitFindFirst.mockResolvedValue({ id: 1 });
    releaseFindFirst.mockResolvedValue(null);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("permite o lançamento dentro do horário comercial", async () => {
    // 10:00 em São Paulo
    vi.setSystemTime(new Date("2026-11-06T13:00:00.000Z"));

    const result = await assessDailyDemandOsAvailability({
      userId: "user-10",
      demandDate,
    });

    expect(result.allowed).toBe(true);
    expect(result.isWithinBusinessHours).toBe(true);
    expect(result.hasRelease).toBe(false);
  });

  it("bloqueia o lançamento após as 17h sem liberação", async () => {
    // 18:30 em São Paulo
    vi.setSystemTime(new Date("2026-11-06T21:30:00.000Z"));

    const result = await assessDailyDemandOsAvailability({
      userId: "user-10",
      demandDate,
    });

    expect(result.allowed).toBe(false);
    expect(result.isWithinBusinessHours).toBe(false);
    expect(result.reason).toContain("08:00 e 17:00");
  });

  it("libera o lançamento após as 17h quando há liberação do ADMTOTAL", async () => {
    vi.setSystemTime(new Date("2026-11-06T21:30:00.000Z"));
    releaseFindFirst.mockResolvedValue({ id: 7 });

    const result = await assessDailyDemandOsAvailability({
      userId: "user-10",
      demandDate,
    });

    expect(result.allowed).toBe(true);
    expect(result.hasRelease).toBe(true);
  });

  it("bloqueia quando o técnico não está em visita técnica no dia", async () => {
    vi.setSystemTime(new Date("2026-11-06T13:00:00.000Z"));
    visitFindFirst.mockResolvedValue(null);

    const result = await assessDailyDemandOsAvailability({
      userId: "user-10",
      demandDate,
    });

    expect(result.allowed).toBe(false);
    expect(result.isVisitTechnician).toBe(false);
  });

  it("permite fora do horário quando a demanda é anterior à regra de 17h", async () => {
    vi.setSystemTime(new Date("2026-11-06T21:30:00.000Z"));

    const result = await assessDailyDemandOsAvailability({
      userId: "user-10",
      demandDate: "2026-04-01",
    });

    expect(result.allowed).toBe(true);
    expect(result.isVisitTechnician).toBe(true);
  });

  it("bloqueia demanda de outra rota no dia, mesmo com liberação", async () => {
    vi.setSystemTime(new Date("2026-11-06T13:00:00.000Z"));
    dailyRouteCount.mockResolvedValue(2);
    membershipFindMany.mockResolvedValue([{ routeId: 1 }]);
    demandFindUnique.mockResolvedValue({ routeId: 2 });
    releaseFindFirst.mockResolvedValue({ id: 7 });

    const result = await assessDailyDemandOsAvailability({
      userId: "user-10",
      demandDate,
      demandId: 99,
    });

    expect(result.allowed).toBe(false);
    expect(result.reason).toContain("outra rota");
  });

  it("permite demanda da própria rota no dia", async () => {
    vi.setSystemTime(new Date("2026-11-06T13:00:00.000Z"));
    dailyRouteCount.mockResolvedValue(2);
    membershipFindMany.mockResolvedValue([{ routeId: 1 }]);
    demandFindUnique.mockResolvedValue({ routeId: 1 });

    const result = await assessDailyDemandOsAvailability({
      userId: "user-10",
      demandDate,
      demandId: 99,
    });

    expect(result.allowed).toBe(true);
  });

  it("gestor não é limitado por horário", async () => {
    vi.setSystemTime(new Date("2026-11-06T23:00:00.000Z"));
    profileFindUnique.mockResolvedValue(techProfile(1, "ADMTOTAL"));

    const result = await assessDailyDemandOsAvailability({
      userId: "user-1",
      demandDate,
    });

    expect(result.allowed).toBe(true);
    expect(result.hasRelease).toBe(true);
  });
});
