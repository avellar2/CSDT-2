import type { Prisma } from "@prisma/client";
import type { AuthUser } from "@/utils/api-auth";
import prisma from "@/utils/prisma";
import {
  getBrazilDayRange,
  formatBrazilDateKey,
} from "@/utils/dailyDemandOsRules";
import {
  getTechnicianRouteIdsByDate,
  isRouteManager,
  isValidDateKey,
  loadTicketAccessContext,
} from "@/utils/operationalRoutes";

/**
 * Escopo operacional de OS externas e demandas.
 *
 * ADMIN/ADMTOTAL enxergam tudo. Técnicos enxergam apenas o que pertence às
 * rotas das quais participam. Em dias sem nenhuma rota cadastrada o
 * comportamento anterior é preservado (filtro pelo nome do responsável).
 */
export type OsScopeContext = {
  isManager: boolean;
  isTechnician: boolean;
  profileId: number;
  displayName: string;
  /** Rotas ativas das quais o técnico participa. */
  routeIds: number[];
  /** Datas (YYYY-MM-DD) que possuem alguma rota operacional. */
  daysWithRoutes: string[];
};

export async function loadOsScope(auth: AuthUser): Promise<OsScopeContext> {
  const isManager = isRouteManager(auth.profile.role);
  const isTechnician = auth.profile.role === "TECH";

  if (!isTechnician) {
    return {
      isManager,
      isTechnician,
      profileId: auth.profile.id,
      displayName: auth.profile.displayName,
      routeIds: [],
      daysWithRoutes: [],
    };
  }

  const context = await loadTicketAccessContext(auth.profile.id);

  return {
    isManager,
    isTechnician,
    profileId: auth.profile.id,
    displayName: auth.profile.displayName,
    routeIds: context.routeIds,
    daysWithRoutes: context.daysWithRoutes,
  };
}

/**
 * Data operacional de uma OS externa. `data` é a data da visita (YYYY-MM-DD);
 * registros antigos sem formato válido caem para a data de criação em
 * America/Sao_Paulo.
 */
export function osExternaDateKey(os: {
  data?: string | null;
  createdAt?: Date | string | null;
}): string {
  if (typeof os.data === "string" && isValidDateKey(os.data)) {
    return os.data;
  }

  if (os.createdAt) {
    return formatBrazilDateKey(new Date(os.createdAt));
  }

  return "";
}

/**
 * Visibilidade de uma OS operacional (não assinada) para o usuário atual.
 * Regras:
 * - OS vinculada a rota → só quem participa daquela rota;
 * - OS sem rota em dia COM rotas → nenhum técnico (pendência sem equipe);
 * - OS sem rota em dia SEM rotas → comportamento antigo (nome do responsável).
 */
export function technicianCanSeeOperationalOs(
  scope: OsScopeContext,
  os: {
    routeId?: number | null;
    data?: string | null;
    createdAt?: Date | string | null;
    tecnicoResponsavel?: string | null;
  }
): boolean {
  if (!scope.isTechnician) {
    return true;
  }

  if (os.routeId !== null && os.routeId !== undefined) {
    return scope.routeIds.includes(os.routeId);
  }

  const dateKey = osExternaDateKey(os);

  if (dateKey && scope.daysWithRoutes.includes(dateKey)) {
    return false;
  }

  return Boolean(
    os.tecnicoResponsavel && os.tecnicoResponsavel.includes(scope.displayName)
  );
}

/**
 * Visibilidade na listagem de OS externas.
 *
 * O histórico de OS assinadas não é redistribuído entre equipes: continua
 * seguindo a regra anterior (responsável pela OS). A separação por rota vale
 * para as OS operacionais/pendentes.
 */
export function technicianCanSeeOsExterna(
  scope: OsScopeContext,
  os: {
    status?: string | null;
    routeId?: number | null;
    data?: string | null;
    createdAt?: Date | string | null;
    tecnicoResponsavel?: string | null;
  }
): boolean {
  if (!scope.isTechnician) {
    return true;
  }

  if (os.status === "Assinado") {
    return Boolean(
      os.tecnicoResponsavel && os.tecnicoResponsavel.includes(scope.displayName)
    );
  }

  return technicianCanSeeOperationalOs(scope, os);
}

/**
 * Filtro equivalente para consultas agregadas de OS operacionais.
 * Usado nos indicadores do dashboard e na checagem de OS pendentes.
 */
export function buildOperationalOsWhere(
  scope: OsScopeContext
): Prisma.OSExternaWhereInput {
  if (!scope.isTechnician) {
    return {};
  }

  const conditions: Prisma.OSExternaWhereInput[] = [];

  if (scope.routeIds.length > 0) {
    conditions.push({ routeId: { in: scope.routeIds } });
  }

  conditions.push({
    routeId: null,
    tecnicoResponsavel: { contains: scope.displayName },
    ...(scope.daysWithRoutes.length > 0
      ? { data: { notIn: scope.daysWithRoutes } }
      : {}),
  });

  return { OR: conditions };
}

/** Filtro do histórico (OS assinadas), preservando a regra anterior. */
export function buildAssignedOsWhere(
  scope: OsScopeContext
): Prisma.OSExternaWhereInput {
  if (!scope.isTechnician) {
    return {};
  }

  return { tecnicoResponsavel: { contains: scope.displayName } };
}

/**
 * Filtro de demandas operacionais para um técnico: demandas da própria rota e,
 * em dias sem rotas, as demandas anteriores à operação por rotas.
 */
export function buildOperationalDemandWhere(
  scope: OsScopeContext
): Prisma.SchoolDemandWhereInput {
  if (!scope.isTechnician) {
    return {};
  }

  const conditions: Prisma.SchoolDemandWhereInput[] = [];

  if (scope.routeIds.length > 0) {
    conditions.push({ routeId: { in: scope.routeIds } });
  }

  const notInRouteDays = scope.daysWithRoutes.map((dateKey) => {
    const { start, end } = getBrazilDayRange(dateKey);
    return { NOT: { createdAt: { gte: start, lte: end } } };
  });

  conditions.push({
    routeId: null,
    ...(notInRouteDays.length > 0 ? { AND: notInRouteDays } : {}),
  });

  return { OR: conditions };
}

/**
 * Resolve a rota de uma OS a partir do técnico responsável informado.
 * Usado quando quem lança a OS é um gestor: a OS só entra em uma equipe se o
 * responsável participa de exatamente uma rota ativa na data.
 */
export async function resolveRouteIdForResponsible(
  tecnicoResponsavel: string | null | undefined,
  dateKey: string
): Promise<number | null> {
  if (!tecnicoResponsavel) {
    return null;
  }

  const primaryName = tecnicoResponsavel
    .split(" / ")[0]
    .trim();

  if (!primaryName || !isValidDateKey(dateKey)) {
    return null;
  }

  const profiles = await prisma.profile.findMany({
    where: { displayName: primaryName },
    select: { id: true },
    take: 5,
  });

  const routeIds = new Set<number>();

  for (const profile of profiles) {
    const ids = await getTechnicianRouteIdsByDate(profile.id, dateKey);
    for (const id of ids) {
      routeIds.add(id);
    }
  }

  return routeIds.size === 1 ? Array.from(routeIds)[0] : null;
}
