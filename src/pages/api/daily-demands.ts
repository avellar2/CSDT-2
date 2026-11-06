import { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/utils/prisma";
import { formatBrazilDateKey, getBrazilDayRange } from "@/utils/dailyDemandOsRules";
import { requireAuth } from "@/utils/api-auth";
import {
  dateKeyFromPrismaDate,
  isValidDateKey,
} from "@/utils/operationalRoutes";

type RouteTechnicianDto = {
  id: number;
  technicianId: number;
  displayName: string;
};

type RouteDto = {
  id: number;
  name: string;
  vehicle: string | null;
  status: string;
  date: string;
  technicians: RouteTechnicianDto[];
};

type RouteWithTechnicians = {
  id: number;
  date: Date;
  name: string;
  vehicle: string | null;
  status: string;
  technicians: {
    id: number;
    technicianId: number;
    technician: { id: number; displayName: string };
  }[];
};

function toRouteDto(route: RouteWithTechnicians): RouteDto {
  return {
    id: route.id,
    name: route.name,
    vehicle: route.vehicle,
    status: route.status,
    date: dateKeyFromPrismaDate(route.date),
    technicians: route.technicians.map((membership) => ({
      id: membership.id,
      technicianId: membership.technicianId,
      displayName: membership.technician.displayName,
    })),
  };
}

async function loadRoutes(dateKeys: string[]): Promise<RouteWithTechnicians[]> {
  if (dateKeys.length === 0) return [];

  return prisma.dailyRoute.findMany({
    where: {
      date: {
        in: Array.from(new Set(dateKeys)).map(
          (key) => new Date(`${key}T00:00:00.000Z`)
        ),
      },
      status: { not: "CANCELLED" },
    },
    include: {
      technicians: {
        where: { active: true },
        include: {
          technician: {
            select: { id: true, displayName: true },
          },
        },
      },
    },
    orderBy: [{ date: "asc" }, { name: "asc" }],
  });
}

function visibleRouteIdsForProfile(
  routes: RouteWithTechnicians[],
  dateKey: string,
  profileId: number
): number[] {
  return routes
    .filter((route) => dateKeyFromPrismaDate(route.date) === dateKey)
    .filter((route) =>
      route.technicians.some((membership) => membership.technicianId === profileId)
    )
    .map((route) => route.id);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({
      success: false,
      message: "Method not allowed",
    });
  }

  const auth = await requireAuth(req, res);
  if (!auth) return;

  try {
    const { date, days } = req.query;
    let startOfDay: Date;
    let endOfDay: Date;
    let requestedDateKeys: string[] = [];

    if (date !== undefined && !isValidDateKey(date)) {
      return res.status(400).json({
        success: false,
        message: "Formato de data invalido. Use YYYY-MM-DD.",
      });
    }

    if (isValidDateKey(date)) {
      const { start, end } = getBrazilDayRange(date);

      if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
        return res.status(400).json({
          success: false,
          message: "Data invalida.",
        });
      }

      startOfDay = start;
      endOfDay = end;
      requestedDateKeys = [date];
    } else if (days) {
      const numDays = parseInt(days as string, 10) || 7;
      const todayKey = formatBrazilDateKey(new Date());
      const { end } = getBrazilDayRange(todayKey);

      endOfDay = end;
      startOfDay = new Date(end);
      startOfDay.setDate(startOfDay.getDate() - numDays);
      startOfDay.setHours(0, 0, 0, 0);
      requestedDateKeys = Array.from({ length: numDays + 1 }, (_, index) => {
        const cursor = new Date(endOfDay);
        cursor.setDate(cursor.getDate() - index);
        return formatBrazilDateKey(cursor);
      });
    } else {
      const todayKey = formatBrazilDateKey(new Date());
      const { start, end } = getBrazilDayRange(todayKey);
      startOfDay = start;
      endOfDay = end;
      requestedDateKeys = [todayKey];
    }

    const [demands, chamadosAgendados, routes] = await Promise.all([
      prisma.schoolDemand.findMany({
        where: {
          createdAt: {
            gte: startOfDay,
            lte: endOfDay,
          },
        },
        include: {
          School: {
            select: {
              name: true,
              address: true,
              district: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      }),
      prisma.chamados_escalas.findMany({
        where: {
          status: "AGENDADO",
          dataAgendamento: {
            gte: startOfDay,
            lte: endOfDay,
          },
        },
        orderBy: {
          dataAgendamento: "desc",
        },
      }),
      loadRoutes(requestedDateKeys),
    ]);

    const routeById = new Map(routes.map((route) => [route.id, route]));
    const isTechnician = auth.profile.role === "TECH";

    const visibleRouteIdsByDate = new Map<string, number[] | null>();
    for (const dateKey of requestedDateKeys) {
      if (!isTechnician) {
        visibleRouteIdsByDate.set(dateKey, null);
        continue;
      }

      const routesOnDate = routes.filter(
        (route) => dateKeyFromPrismaDate(route.date) === dateKey
      );

      // Sem rotas no dia: comportamento tradicional preservado.
      visibleRouteIdsByDate.set(
        dateKey,
        routesOnDate.length === 0
          ? null
          : visibleRouteIdsForProfile(routesOnDate, dateKey, auth.profile.id)
      );
    }

    const safeDemands = demands
      .filter((demand) => {
        const demandKey = formatBrazilDateKey(demand.createdAt);
        const visibleRouteIds = visibleRouteIdsByDate.get(demandKey);
        if (visibleRouteIds === null || visibleRouteIds === undefined) {
          return true;
        }
        return demand.routeId !== null && visibleRouteIds.includes(demand.routeId);
      })
      .map((demand) => {
        const route = demand.routeId ? routeById.get(demand.routeId) : undefined;
        return {
          id: demand.id.toString(),
          title: `Demanda - ${demand.School?.name || "Escola nao especificada"}`,
          description: demand.demand || "Sem descricao fornecida",
          createdAt: demand.createdAt.toISOString(),
          visitStatus: demand.visitStatus || null,
          visitReason: demand.visitReason || null,
          visitUpdatedBy: demand.visitUpdatedBy || null,
          visitUpdatedAt: demand.visitUpdatedAt?.toISOString() || null,
          isReagendamento: false,
          routeId: demand.routeId,
          route: route ? toRouteDto(route) : null,
        };
      });

    const safeChamados = chamadosAgendados
      .filter((chamado) => {
        const chamadoDate = chamado.dataAgendamento || chamado.dataCriacao;
        const chamadoKey = formatBrazilDateKey(chamadoDate);
        const visibleRouteIds = visibleRouteIdsByDate.get(chamadoKey);
        if (visibleRouteIds === null || visibleRouteIds === undefined) {
          return true;
        }
        return chamado.routeId !== null && visibleRouteIds.includes(chamado.routeId);
      })
      .map((chamado) => {
        const route = chamado.routeId ? routeById.get(chamado.routeId) : undefined;
        return {
          id: `chamado-${chamado.id}`,
          title: chamado.titulo,
          description: chamado.descricao,
          createdAt:
            chamado.dataAgendamento?.toISOString() ||
            chamado.dataCriacao.toISOString(),
          isReagendamento: true,
          categoria: chamado.categoria,
          tecnico: chamado.tecnico,
          osOriginal: chamado.osOriginal,
          routeId: chamado.routeId,
          route: route ? toRouteDto(route) : null,
        };
      });

    const allDemands = [...safeDemands, ...safeChamados].sort((a, b) => {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    // Técnicos recebem apenas as próprias rotas na resposta.
    const visibleRoutes = isTechnician
      ? routes.filter((route) =>
          visibleRouteIdsByDate
            .get(dateKeyFromPrismaDate(route.date))
            ?.includes(route.id)
        )
      : routes;

    return res.status(200).json({
      success: true,
      data: allDemands,
      message: `Encontradas ${allDemands.length} demandas (${safeDemands.length} normais + ${safeChamados.length} reagendamentos)`,
      routes: visibleRoutes.map(toRouteDto),
      debug: {
        startOfDay: startOfDay.toISOString(),
        endOfDay: endOfDay.toISOString(),
        totalNormalDemands: demands.length,
        totalReagendamentos: chamadosAgendados.length,
        totalCombined: allDemands.length,
        routesForRequestedDates: routes.length,
        role: auth.profile.role,
      },
    });
  } catch (error) {
    console.error("Erro no servidor:", error);
    return res.status(500).json({
      success: false,
      message: "Erro interno no servidor",
      error: error instanceof Error ? error.message : "Erro desconhecido",
    });
  }
}
