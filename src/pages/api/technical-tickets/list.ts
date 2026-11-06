import { NextApiRequest, NextApiResponse } from 'next';
import { Prisma, PrismaClient } from '@prisma/client';
import { requireAuth } from "@/utils/api-auth";
import { getRouteIdsForTechnician, isRouteManager } from "@/utils/operationalRoutes";

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const auth = await requireAuth(req, res);
  if (!auth) return;

  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { status, schoolId, assignedTo, routeId } = req.query;

    // Construir filtros
    const where: Prisma.TechnicalTicketWhereInput = {
      // Por padrão, não mostrar chamados excluídos
      status: { not: 'DELETED' }
    };

    if (status && status !== 'all') {
      where.status = status as Prisma.TechnicalTicketWhereInput['status'];
    }

    if (schoolId) {
      where.schoolId = parseInt(schoolId as string);
    }

    if (assignedTo) {
      where.assignedTo = assignedTo as string;
    }

    if (routeId && routeId !== 'all') {
      where.routeId = parseInt(routeId as string);
    } else if (routeId === 'unassigned') {
      where.routeId = null;
    }

    // Técnicos só enxergam tickets destinados às rotas das quais participam.
    // Sem nenhuma rota cadastrada no sistema, mantém o comportamento antigo.
    if (!isRouteManager(auth.profile.role) && auth.profile.role === 'TECH') {
      const technicianRouteIds = await getRouteIdsForTechnician(auth.profile.id);

      if (technicianRouteIds.length > 0) {
        where.routeId = { in: technicianRouteIds };
      } else {
        const anyRoutes = await prisma.dailyRoute.count({
          where: { status: { notIn: ['CANCELLED'] } },
        });

        if (anyRoutes > 0) {
          where.routeId = { in: [] };
        }
      }
    }

    // Buscar chamados
    const tickets = await prisma.technicalTicket.findMany({
      where,
      take: 200,
      include: {
        School: true,
        ScheduleEvent: true,
        DailyRoute: {
          select: { id: true, name: true, vehicle: true, status: true, date: true },
        },
      },
      orderBy: [
        { status: 'asc' }, // OPEN primeiro
        { createdAt: 'desc' }
      ]
    });

    // Estatísticas respeitando o escopo de acesso.
    const stats = await prisma.technicalTicket.groupBy({
      by: ['status'],
      where,
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
