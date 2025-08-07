import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { ticketId } = req.query;
    const { deletedBy, deletionReason } = req.body;

    if (!ticketId || !deletedBy || !deletionReason) {
      return res.status(400).json({ 
        error: 'Campos obrigatórios: ticketId, deletedBy, deletionReason' 
      });
    }

    // Buscar o chamado atual
    const currentTicket = await prisma.technicalTicket.findUnique({
      where: { id: parseInt(ticketId as string) },
      include: { School: true, Event: true }
    });

    if (!currentTicket) {
      return res.status(404).json({ error: 'Chamado não encontrado' });
    }

    // Verificar se o chamado já foi deletado
    if (currentTicket.status === 'DELETED') {
      return res.status(400).json({ error: 'Chamado já foi excluído' });
    }

    // Marcar como deletado (soft delete)
    const updatedTicket = await prisma.technicalTicket.update({
      where: { id: parseInt(ticketId as string) },
      data: {
        status: 'DELETED',
        deletedAt: new Date(),
        deletedBy,
        deletionReason: deletionReason.trim()
      },
      include: {
        School: true,
        Event: true
      }
    });

    // Se havia um evento agendado, remover da agenda
    if (currentTicket.eventId) {
      try {
        await prisma.scheduleEvent.delete({
          where: { id: currentTicket.eventId }
        });
        console.log(`Evento ${currentTicket.eventId} removido da agenda`);
      } catch (eventError) {
        console.error('Erro ao remover evento da agenda:', eventError);
        // Não falhar a operação se não conseguir remover o evento
      }
    }

    console.log(`Chamado técnico excluído: ${updatedTicket.id} - Motivo: ${deletionReason}`);

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