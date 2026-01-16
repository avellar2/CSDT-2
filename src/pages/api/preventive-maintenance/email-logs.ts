import { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * API para listar logs de envio de emails de Manutenção Preventiva
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Método não permitido" });
  }

  try {
    const { status, limit } = req.query;

    // Filtros opcionais
    const where: any = {};
    if (status === 'failed') {
      where.status = 'failed';
    } else if (status === 'success') {
      where.status = 'success';
    }

    const logs = await prisma.preventiveMaintenanceEmailLog.findMany({
      where,
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
        sentAt: 'desc',
      },
      take: limit ? parseInt(limit as string) : undefined,
    });

    // Estatísticas
    const totalSuccess = await prisma.preventiveMaintenanceEmailLog.count({
      where: { status: 'success' }
    });

    const totalFailed = await prisma.preventiveMaintenanceEmailLog.count({
      where: { status: 'failed' }
    });

    return res.status(200).json({
      success: true,
      total: logs.length,
      statistics: {
        totalSuccess,
        totalFailed,
        totalLogs: totalSuccess + totalFailed,
      },
      data: logs,
    });

  } catch (error) {
    console.error('Erro ao listar logs:', error);
    return res.status(500).json({
      success: false,
      error: 'Erro ao listar logs',
      details: String(error),
    });
  } finally {
    await prisma.$disconnect();
  }
}
