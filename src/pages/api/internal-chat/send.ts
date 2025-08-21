import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const {
      ticketId,
      senderId,
      senderName,
      senderType,
      content,
      attachments = []
    } = req.body;

    // Validações básicas
    if (!ticketId || !senderId || !senderName || !senderType || !content) {
      return res.status(400).json({
        success: false,
        message: 'Dados obrigatórios não fornecidos'
      });
    }

    // Verificar se o ticket existe
    const ticket = await prisma.internalTicket.findUnique({
      where: { id: parseInt(ticketId) }
    });

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Ticket não encontrado'
      });
    }

    // Criar a mensagem
    const message = await prisma.internalChatMessage.create({
      data: {
        ticketId: parseInt(ticketId),
        senderId: senderId.toString(),
        senderName,
        senderType,
        content,
        attachments
      }
    });

    // Atualizar o timestamp do ticket
    await prisma.internalTicket.update({
      where: { id: parseInt(ticketId) },
      data: { updatedAt: new Date() }
    });

    res.status(200).json({
      success: true,
      messageId: message.id,
      sentAt: message.sentAt
    });

  } catch (error) {
    console.error('Erro ao enviar mensagem:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  } finally {
    await prisma.$disconnect();
  }
}