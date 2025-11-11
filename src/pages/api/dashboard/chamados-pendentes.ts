import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/utils/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    // Contar chamados pendentes (abertos e atribuídos)
    const pendingCount = await prisma.chamados_escola.count({
      where: {
        status: {
          in: ['OPEN', 'ASSIGNED', 'IN_PROGRESS']
        }
      }
    });

    // Buscar detalhes dos chamados pendentes mais recentes
    const recentChamados = await prisma.chamados_escola.findMany({
      where: {
        status: {
          in: ['OPEN', 'ASSIGNED', 'IN_PROGRESS']
        }
      },
      include: {
        School: {
          select: {
            name: true,
            district: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 10 // Últimos 10 chamados pendentes
    });

    // Contar por prioridade
    const priorityStats = await prisma.chamados_escola.groupBy({
      by: ['priority'],
      where: {
        status: {
          in: ['OPEN', 'ASSIGNED', 'IN_PROGRESS']
        }
      },
      _count: {
        priority: true
      }
    });

    // Contar por categoria
    const categoryStats = await prisma.chamados_escola.groupBy({
      by: ['category'],
      where: {
        status: {
          in: ['OPEN', 'ASSIGNED', 'IN_PROGRESS']
        }
      },
      _count: {
        category: true
      }
    });

    res.status(200).json({
      success: true,
      data: {
        totalPending: pendingCount,
        recentChamados,
        priorityStats,
        categoryStats
      }
    });
  } catch (error) {
    console.error('Erro ao buscar chamados pendentes:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
}