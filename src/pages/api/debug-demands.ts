import { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({
      success: false,
      message: "Method not allowed",
    });
  }

  try {
    // Buscar TODAS as demandas para debug
    const allDemands = await prisma.schoolDemand.findMany({
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
      take: 20, // Limit to last 20 for performance
    });

    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0, 0);
    const todayEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);

    const demandsInfo = allDemands.map(demand => ({
      id: demand.id,
      schoolName: demand.School?.name,
      demand: demand.demand.substring(0, 50) + '...',
      createdAt: demand.createdAt.toISOString(),
      isToday: demand.createdAt >= todayStart && demand.createdAt <= todayEnd,
      daysDiff: Math.floor((today.getTime() - demand.createdAt.getTime()) / (1000 * 60 * 60 * 24))
    }));

    const todayDemands = demandsInfo.filter(d => d.isToday);

    res.status(200).json({
      success: true,
      debug: {
        totalDemands: allDemands.length,
        todayDemands: todayDemands.length,
        todayStart: todayStart.toISOString(),
        todayEnd: todayEnd.toISOString(),
        serverTime: new Date().toISOString(),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
      allDemands: demandsInfo,
      todayOnly: todayDemands
    });
  } catch (error) {
    console.error("Erro no servidor:", error);
    res.status(500).json({
      success: false,
      message: "Erro interno no servidor",
      error: error instanceof Error ? error.message : "Erro desconhecido",
    });
  } finally {
    await prisma.$disconnect();
  }
}