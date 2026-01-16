import { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * API para listar todas as OS de Manutenção Preventiva capturadas
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Método não permitido" });
  }

  try {
    const osList = await prisma.preventiveMaintenanceOS.findMany({
      include: {
        School: {
          select: {
            id: true,
            name: true,
            email: true,
            district: true,
          }
        }
      },
      orderBy: {
        emailReceivedAt: 'desc',
      },
    });

    return res.status(200).json({
      success: true,
      total: osList.length,
      data: osList,
    });

  } catch (error) {
    console.error('Erro ao listar OS:', error);
    return res.status(500).json({
      success: false,
      error: 'Erro ao listar OS',
      details: String(error),
    });
  } finally {
    await prisma.$disconnect();
  }
}
