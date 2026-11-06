import prisma from "@/utils/prisma";
import { formatBrazilDateKey } from "@/utils/dailyDemandOsRules";

export const ROUTE_MANAGER_ROLES = ["ADMIN", "ADMTOTAL"] as const;
export const ROUTE_OPEN_STATUSES = ["PLANNED", "IN_PROGRESS"] as const;
const ROUTE_HIDDEN_STATUSES = ["CANCELLED"] as const;

export function isRouteManager(role: string): boolean {
  return (ROUTE_MANAGER_ROLES as readonly string[]).includes(role);
}

export function routeStatusIsOpen(status: string): boolean {
  return (ROUTE_OPEN_STATUSES as readonly string[]).includes(status);
}

export function isValidDateKey(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

/** Converte uma chave YYYY-MM-DD em valor para colunas `@db.Date` (UTC). */
export function prismaDateFromKey(dateKey: string): Date {
  return new Date(`${dateKey}T00:00:00.000Z`);
}

/** Lê uma coluna `@db.Date` sem sofrer deslocamento de fuso. */
export function dateKeyFromPrismaDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/**
 * Instante fixo (meio-dia em America/Sao_Paulo) para uma chave YYYY-MM-DD.
 * Usado em colunas DateTime que representam "o dia" sem horário real.
 */
export function prismaDateTimeFromDateKey(dateKey: string): Date {
  return new Date(`${dateKey}T12:00:00-03:00`);
}

/** Data operacional de uma demanda (criação no fuso America/Sao_Paulo). */
export function demandDateKey(date: Date): string {
  return formatBrazilDateKey(date);
}

export function buildRouteConflictKey(technicianId: number, dateKey: string): string {
  return `${technicianId}:${dateKey}`;
}

/**
 * Rotas ativas das quais o perfil participa. Retorna apenas as rotas
 * operacionais que concedem acesso à data consultada.
 */
export async function getRouteIdsForTechnician(
  technicianId: number,
  options: { dateKey?: string } = {}
): Promise<number[]> {
  const memberships = await prisma.dailyRouteTechnician.findMany({
    where: {
      technicianId,
      active: true,
      ...(options.dateKey
        ? { routeDate: prismaDateFromKey(options.dateKey) }
        : {}),
      route: {
        status: {
          notIn: [...ROUTE_HIDDEN_STATUSES],
        },
      },
    },
    select: { routeId: true },
  });

  return Array.from(new Set(memberships.map((membership) => membership.routeId)));
}

export async function getTechnicianRouteIdsByDate(
  technicianId: number,
  dateKey: string
): Promise<number[]> {
  return getRouteIdsForTechnician(technicianId, { dateKey });
}

export async function isTechnicianInRoute(
  technicianId: number,
  routeId: number
): Promise<boolean> {
  const membership = await prisma.dailyRouteTechnician.findFirst({
    where: {
      technicianId,
      routeId,
      active: true,
    },
    select: { id: true },
  });

  return Boolean(membership);
}

/**
 * Verifica se um técnico pode acessar uma demanda. ADMIN/ADMTOTAL têm acesso
 * total; demais perfis de equipe só acessam demandas da própria rota.
 */
export async function canProfileAccessDemand(params: {
  profileId: number;
  role: string;
  demandId: number;
  demandCreatedAt: Date;
  demandRouteId: number | null;
}): Promise<boolean> {
  if (isRouteManager(params.role)) {
    return true;
  }

  if (params.role !== "TECH") {
    return true;
  }

  const dateKey = demandDateKey(params.demandCreatedAt);
  const routeIds = await getTechnicianRouteIdsByDate(params.profileId, dateKey);

  if (routeIds.length === 0) {
    // Compatibilidade: sem nenhuma rota configurada no dia, mantém o
    // comportamento tradicional (técnico em visita enxerga as demandas).
    const routesExistForDate = await prisma.dailyRoute.count({
      where: {
        date: prismaDateFromKey(dateKey),
        status: { notIn: [...ROUTE_HIDDEN_STATUSES] },
      },
    });

    return routesExistForDate === 0;
  }

  return params.demandRouteId !== null && routeIds.includes(params.demandRouteId);
}

/**
 * Regra de compatibilidade central: quando não existe nenhuma rota cadastrada
 * para a data, os fluxos antigos continuam valendo integralmente.
 */
export async function hasRoutesForDate(dateKey: string): Promise<boolean> {
  const count = await prisma.dailyRoute.count({
    where: {
      date: prismaDateFromKey(dateKey),
      status: { notIn: [...ROUTE_HIDDEN_STATUSES] },
    },
  });

  return count > 0;
}

export async function getTechnicianProfileIdByUserId(
  userId: string
): Promise<number | null> {
  const profile = await prisma.profile.findUnique({
    where: { userId },
    select: { id: true },
  });

  return profile?.id ?? null;
}

export type RouteScopeEntry = { id: number; technicianIds: number[] };

/**
 * Carrega as rotas (e seus técnicos ativos) das datas informadas para decidir
 * visibilidade no backend sem depender de filtros do React.
 */
export async function loadRouteScope(
  dateKeys: string[]
): Promise<Map<string, RouteScopeEntry[]>> {
  const uniqueKeys = Array.from(new Set(dateKeys.filter(Boolean)));

  const scope = new Map<string, RouteScopeEntry[]>();
  if (uniqueKeys.length === 0) return scope;

  const routes = await prisma.dailyRoute.findMany({
    where: {
      date: { in: uniqueKeys.map(prismaDateFromKey) },
      status: { notIn: [...ROUTE_HIDDEN_STATUSES] },
    },
    select: {
      id: true,
      date: true,
      technicians: {
        where: { active: true },
        select: { technicianId: true },
      },
    },
  });

  for (const route of routes) {
    const dateKey = dateKeyFromPrismaDate(route.date);
    const entries = scope.get(dateKey) || [];
    entries.push({
      id: route.id,
      technicianIds: route.technicians.map((membership) => membership.technicianId),
    });
    scope.set(dateKey, entries);
  }

  return scope;
}

/**
 * Regra de visibilidade de um registro (demanda/chamado) para um técnico.
 * Em dias sem rotas cadastradas o comportamento antigo é preservado.
 */
export function canTechnicianSeeRouteEntity(params: {
  scope: Map<string, RouteScopeEntry[]>;
  dateKey: string;
  routeId: number | null;
  profileId: number;
}): boolean {
  const routesOnDate = params.scope.get(params.dateKey) || [];

  if (routesOnDate.length === 0) {
    return true;
  }

  if (params.routeId === null) {
    return false;
  }

  return routesOnDate.some(
    (route) =>
      route.id === params.routeId &&
      route.technicianIds.includes(params.profileId)
  );
}
