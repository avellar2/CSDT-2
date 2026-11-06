import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';
import { requireAuth } from "@/utils/api-auth";
import { getRouteIdsForTechnician, isRouteManager } from "@/utils/operationalRoutes";

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const auth = await requireAuth(req, res);
  if (!auth) return;

  if (req.method !== 'DELETE') {
    res.setHeader('Allow', ['DELETE']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { ticketId } = req.query;
    const { deletionReason } = req.body || {};

    if (!ticketId || !deletionReason) {
      return res.status(400).json({
        error: 'Campos obrigatórios: ticketId, deletionReason'
      });
    }

    // Buscar o chamado atual
    const currentTicket = await prisma.technicalTicket.findUnique({
      where: { id: parseInt(ticketId as string) },
      include: { School: true, ScheduleEvent: true }
    });

    if (!currentTicket) {
      return res.status(404).json({ error: 'Chamado não encontrado' });
    }

    // Técnicos só excluem chamados das próprias rotas.
    if (!isRouteManager(auth.profile.role) && auth.profile.role === 'TECH') {
      const technicianRouteIds = await getRouteIdsForTechnician(auth.profile.id);
      const anyRoutes = await prisma.dailyRoute.count({
        where: { status: { notIn: ['CANCELLED'] } },
      });

      if (
        technicianRouteIds.length > 0 &&
        (currentTicket.routeId === null ||
          !technicianRouteIds.includes(currentTicket.routeId))
      ) {
        return res.status(403).json({ error: 'Este chamado pertence a outra rota.' });
      }

      if (technicianRouteIds.length === 0 && anyRoutes > 0) {
        return res.status(403).json({
          error: 'Você não participa de nenhuma rota ativa.',
        });
      }
    }

    // Verificar se o chamado já foi deletado
    if (currentTicket.status === 'DELETED') {
      return res.status(400).json({ error: 'Chamado já foi excluído' });
    }

    // Marcar como deletado (soft delete). O autor vem da sessão autenticada.
    const updatedTicket = await prisma.technicalTicket.update({
      where: { id: parseInt(ticketId as string) },
      data: {
        status: 'DELETED',
        deletedAt: new Date(),
        deletedBy: auth.id,
        deletionReason: String(deletionReason).trim()
      },
      include: {
        School: true,
        ScheduleEvent: true
      }
    });

    // Se havia um evento agendado, remover da agenda
    if (currentTicket.eventId) {
      try {
        await prisma.scheduleEvent.delete({
          where: { id: currentTicket.eventId }
        });
      } catch (eventError) {
        console.error('Erro ao remover evento da agenda:', eventError);
        // Não falhar a operação se não conseguir remover o evento
      }
    }

    res.status(200).json({
      success: true,
      message: 'Chamado excluído com sucesso',
      ticket: updatedTicket
    });

  } catch (error) {
    console.error('Erro ao excluir chamado técnico:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      details: process.env.NODE_ENV === 'development' ? error : undefined
    });
  } finally {
    await prisma.$disconnect();
  }
}
