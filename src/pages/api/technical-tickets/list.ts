import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { status, schoolId, assignedTo } = req.query;

    // Construir filtros
    const where: any = {
      // Por padrão, não mostrar chamados excluídos
      status: { not: 'DELETED' }
    };
    
    if (status && status !== 'all') {
      where.status = status;
    }
    
    if (schoolId) {
      where.schoolId = parseInt(schoolId as string);
    }
    
    if (assignedTo) {
      where.assignedTo = assignedTo;
    }

    // Buscar chamados
    const tickets = await prisma.technicalTicket.findMany({
      where,
      include: {
        School: true,
        Event: true
      },
      orderBy: [
        { status: 'asc' }, // OPEN primeiro
        { createdAt: 'desc' }
      ]
    });

    // Estatísticas
    const stats = await prisma.technicalTicket.groupBy({
      by: ['status'],
      _count: {
        _all: true
      }
    });

    const statsMap = stats.reduce((acc, stat) => {
      acc[stat.status] = stat._count._all;
      return acc;
    }, {} as Record<string, number>);

    res.status(200).json({
      success: true,
      tickets,
      stats: {
        total: tickets.length,
        open: statsMap.OPEN || 0,
        assigned: statsMap.ASSIGNED || 0,
        scheduled: statsMap.SCHEDULED || 0,
        inProgress: statsMap.IN_PROGRESS || 0,
        resolved: statsMap.RESOLVED || 0,
        closed: statsMap.CLOSED || 0,
        cancelled: statsMap.CANCELLED || 0
      }
    });

  } catch (error) {
    console.error('Erro ao listar chamados técnicos:', error);
    res.status(500).json({ 
      error: 'Erro interno do servidor',
      details: process.env.NODE_ENV === 'development' ? error : undefined
    });
  } finally {
    await prisma.$disconnect();
  }
}