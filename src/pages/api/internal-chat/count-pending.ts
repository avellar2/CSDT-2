import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // Contar chamados pendentes (OPEN = ainda não foram aceitos por um técnico)
    const pendingCount = await prisma.internal_tickets.count({
      where: {
        status: 'OPEN'
      }
    });

    // Contar chamados por status para estatísticas extras
    const statusCounts = await prisma.internal_tickets.groupBy({
      by: ['status'],
      _count: {
        status: true
      }
    });

    // Organizar contadores por status
    const counts = {
      open: 0,
      assigned: 0,
      in_progress: 0,
      waiting: 0,
      resolved: 0,
      closed: 0,
      cancelled: 0
    };

    statusCounts.forEach(item => {
      const status = item.status.toLowerCase() as keyof typeof counts;
      if (status in counts) {
        counts[status] = item._count.status;
      }
    });

    // Contar chamados que precisam de atenção (OPEN + IN_PROGRESS + WAITING)
    const needsAttention = counts.open + counts.in_progress + counts.waiting;

    res.status(200).json({
      success: true,
      pending: pendingCount,
      needsAttention,
      counts,
      total: statusCounts.reduce((sum, item) => sum + item._count.status, 0)
    });

  } catch (error) {
    console.error('Erro ao contar chamados:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  } finally {
    await prisma.$disconnect();
  }
}