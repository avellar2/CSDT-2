import { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/utils/prisma";
import { formatBrazilDateKey, getBrazilDayRange } from "@/utils/dailyDemandOsRules";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({
      success: false,
      message: "Method not allowed",
    });
  }

  try {
    const { date, days } = req.query;
    let startOfDay: Date;
    let endOfDay: Date;

    if (date && typeof date === "string" && !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({
        success: false,
        message: "Formato de data invalido. Use YYYY-MM-DD.",
      });
    }

    if (date && typeof date === "string") {
      const { start, end } = getBrazilDayRange(date);

      if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
        return res.status(400).json({
          success: false,
          message: "Data invalida.",
        });
      }

      startOfDay = start;
      endOfDay = end;
    } else if (days) {
      const numDays = parseInt(days as string, 10) || 7;
      const todayKey = formatBrazilDateKey(new Date());
      const { end } = getBrazilDayRange(todayKey);

      endOfDay = end;
      startOfDay = new Date(end);
      startOfDay.setDate(startOfDay.getDate() - numDays);
      startOfDay.setHours(0, 0, 0, 0);
    } else {
      const todayKey = formatBrazilDateKey(new Date());
      const { start, end } = getBrazilDayRange(todayKey);
      startOfDay = start;
      endOfDay = end;
    }

    const demands = await prisma.schoolDemand.findMany({
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
    });

    const chamadosAgendados = await prisma.chamados_escalas.findMany({
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
    });

    const safeDemands = demands.map((demand) => ({
      id: demand.id.toString(),
      title: `Demanda - ${demand.School?.name || "Escola nao especificada"}`,
      description: demand.demand || "Sem descricao fornecida",
      createdAt: demand.createdAt.toISOString(),
      visitStatus: demand.visitStatus || null,
      visitReason: demand.visitReason || null,
      visitUpdatedBy: demand.visitUpdatedBy || null,
      visitUpdatedAt: demand.visitUpdatedAt?.toISOString() || null,
      isReagendamento: false,
    }));

    const safeChamados = chamadosAgendados.map((chamado) => ({
      id: `chamado-${chamado.id}`,
      title: chamado.titulo,
      description: chamado.descricao,
      createdAt: chamado.dataAgendamento?.toISOString() || chamado.dataCriacao.toISOString(),
      isReagendamento: true,
      categoria: chamado.categoria,
      tecnico: chamado.tecnico,
      osOriginal: chamado.osOriginal,
    }));

    const allDemands = [...safeDemands, ...safeChamados].sort((a, b) => {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    return res.status(200).json({
      success: true,
      data: allDemands,
      message: `Encontradas ${allDemands.length} demandas (${safeDemands.length} normais + ${safeChamados.length} reagendamentos)`,
      debug: {
        startOfDay: startOfDay.toISOString(),
        endOfDay: endOfDay.toISOString(),
        totalNormalDemands: demands.length,
        totalReagendamentos: chamadosAgendados.length,
        totalCombined: allDemands.length,
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
