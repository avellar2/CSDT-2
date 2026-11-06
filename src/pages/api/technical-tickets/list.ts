import { NextApiRequest, NextApiResponse } from 'next';
import { Prisma, PrismaClient } from '@prisma/client';
import { requireAuth } from "@/utils/api-auth";
import {
  buildTechnicianTicketWhere,
  isRouteManager,
  loadTicketAccessContext,
} from "@/utils/operationalRoutes";

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const auth = await requireAuth(req, res);
  if (!auth) return;

  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { status, schoolId, assignedTo } = req.query;
    const routeIdQuery = Array.isArray(req.query.routeId)
      ? req.query.routeId[0]
      : req.query.routeId;

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

    // Filtro de rota: aceita "all", "unassigned" ou um ID numérico válido.
    if (typeof routeIdQuery === 'string' && routeIdQuery.length > 0 && routeIdQuery !== 'all') {
      if (routeIdQuery === 'unassigned') {
        where.routeId = null;
      } else {
        const parsedRouteId = Number(routeIdQuery);
        if (!Number.isInteger(parsedRouteId) || parsedRouteId <= 0) {
          return res.status(400).json({
            error: 'routeId deve ser "all", "unassigned" ou um ID numérico válido.'
          });
        }
        where.routeId = parsedRouteId;
      }
    }

    // Técnicos só enxergam chamados destinados à própria rota. A decisão usa
    // a data operacional de cada chamado (não a existência global de rotas),
    // preservando os chamados antigos de dias sem rotas.
    if (!isRouteManager(auth.profile.role) && auth.profile.role === 'TECH') {
      const access = await loadTicketAccessContext(auth.profile.id);
      where.AND = [buildTechnicianTicketWhere(access)];
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
