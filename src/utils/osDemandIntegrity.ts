import prisma from "@/utils/prisma";
import { formatBrazilDateKey } from "@/utils/dailyDemandOsRules";
import {
  getTechnicianRouteIdsByDate,
  hasRoutesForDate,
  isRouteManager,
} from "@/utils/operationalRoutes";

/**
 * Integridade do vínculo demanda → OS → rota.
 *
 * O frontend envia `context.dailyDemandId`, `context.dailyDemandDate` e a data
 * da OS, mas nenhum desses valores é confiável por si só. A validação recarrega
 * a demanda no banco e confere:
 *
 * 1. a demanda existe;
 * 2. a data operacional real da demanda (America/Sao_Paulo) é a data informada;
 * 3. a data da OS é exatamente a data operacional da demanda;
 * 4. o técnico autenticado participa da rota da demanda naquele dia.
 *
 * Sem isso, um técnico poderia apontar para uma demanda de outro dia ou de
 * outra equipe e gravar uma OS com vínculo indevido.
 */
export type DemandOsLinkResult =
  | {
      ok: true;
      demand: { id: number; routeId: number | null; dateKey: string };
    }
  | { ok: false; status: 400 | 403 | 404; error: string };

export async function validateDemandOsLink(params: {
  profile: { id: number; role: string };
  demandId: number;
  /** Data enviada pelo frontend (context.dailyDemandDate). */
  demandDate: string;
  /** Data operacional que será gravada na OS. */
  osDateKey: string;
}): Promise<DemandOsLinkResult> {
  const demand = await prisma.schoolDemand.findUnique({
    where: { id: params.demandId },
    select: { id: true, routeId: true, createdAt: true },
  });

  if (!demand) {
    return {
      ok: false,
      status: 404,
      error: "A demanda informada não foi encontrada.",
    };
  }

  const dateKey = formatBrazilDateKey(demand.createdAt);

  if (dateKey !== params.demandDate) {
    return {
      ok: false,
      status: 400,
      error: `A demanda ${demand.id} pertence a ${dateKey}, não a ${params.demandDate}.`,
    };
  }

  if (dateKey !== params.osDateKey) {
    return {
      ok: false,
      status: 400,
      error: `A OS deve usar a data operacional da demanda (${dateKey}).`,
    };
  }

  if (isRouteManager(params.profile.role)) {
    return { ok: true, demand: { id: demand.id, routeId: demand.routeId, dateKey } };
  }

  if (params.profile.role !== "TECH") {
    return {
      ok: false,
      status: 403,
      error: "Perfil sem permissão para lançar OS desta demanda.",
    };
  }

  if (demand.routeId === null) {
    // Compatibilidade: em dias sem rotas cadastradas vale o fluxo anterior.
    // Em dias com rotas, a demanda precisa estar atribuída a uma equipe.
    const routesExist = await hasRoutesForDate(dateKey);
    if (routesExist) {
      return {
        ok: false,
        status: 403,
        error: "Esta demanda ainda não foi atribuída a uma rota.",
      };
    }

    return { ok: true, demand: { id: demand.id, routeId: null, dateKey } };
  }

  const routeIds = await getTechnicianRouteIdsByDate(params.profile.id, dateKey);

  if (!routeIds.includes(demand.routeId)) {
    return {
      ok: false,
      status: 403,
      error: "Esta demanda pertence a outra equipe.",
    };
  }

  return { ok: true, demand: { id: demand.id, routeId: demand.routeId, dateKey } };
}
