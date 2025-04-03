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
    // Configuração do filtro de data
    const now = new Date();
    const startOfDay = new Date(now.setHours(0, 0, 0, 0));
    const endOfDay = new Date(now.setHours(23, 59, 59, 999));

    // Consulta com tratamento de erros específico
    const demands = await prisma.schoolDemand.findMany({
      where: {
        createdAt: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      include: {
        school: {
          select: {
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Formatação segura dos dados
    const safeDemands = demands.map((demand) => ({
      id: demand.id.toString(), // Garante que o ID seja string
      title: `Demanda - ${demand.school?.name || "Escola não especificada"}`,
      description: demand.demand || "Sem descrição fornecida",
      createdAt: demand.createdAt.toISOString(), // Formato padrão para datas
    }));

    res.status(200).json({
      success: true,
      data: safeDemands,
      message: `Encontradas ${safeDemands.length} demandas`,
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