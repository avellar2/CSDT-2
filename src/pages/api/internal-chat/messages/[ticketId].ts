import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { ticketId } = req.query;
    const { lastMessageId, limit = 50 } = req.query;

    if (!ticketId) {
      return res.status(400).json({
        success: false,
        message: 'Ticket ID é obrigatório'
      });
    }

    // Construir query para buscar mensagens
    const whereClause: any = {
      ticketId: parseInt(ticketId as string)
    };

    // Se lastMessageId for fornecido, buscar apenas mensagens mais recentes
    if (lastMessageId) {
      whereClause.id = {
        gt: parseInt(lastMessageId as string)
      };
    }

    const messages = await prisma.internal_chat_messages.findMany({
      where: whereClause,
      orderBy: { sentAt: 'asc' },
      take: parseInt(limit as string)
    });

    res.status(200).json({
      success: true,
      messages,
      count: messages.length
    });

  } catch (error) {
    console.error('Erro ao buscar mensagens:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  } finally {
    await prisma.$disconnect();
  }
}