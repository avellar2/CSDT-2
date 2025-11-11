import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { ticketId } = req.query;

    if (!ticketId) {
      return res.status(400).json({ error: 'ID do chamado é obrigatório' });
    }

    if (req.method === 'GET') {
      // Listar comentários do chamado
      const comments = await prisma.ticketComment.findMany({
        where: { ticketId: parseInt(ticketId as string) },
        orderBy: { createdAt: 'asc' }
      });

      res.status(200).json({
        success: true,
        comments
      });

    } else if (req.method === 'POST') {
      // Criar novo comentário
      const { authorId, authorName, authorRole, content, isInternal } = req.body;

      if (!authorId || !authorName || !authorRole || !content) {
        return res.status(400).json({ 
          error: 'Campos obrigatórios: authorId, authorName, authorRole, content' 
        });
      }

      // Verificar se o chamado existe
      const ticket = await prisma.technicalTicket.findUnique({
        where: { id: parseInt(ticketId as string) }
      });

      if (!ticket) {
        return res.status(404).json({ error: 'Chamado não encontrado' });
      }

      const comment = await prisma.ticketComment.create({
        data: {
          ticketId: parseInt(ticketId as string),
          authorId,
          authorName,
          authorRole,
          content: content.trim(),
          isInternal: isInternal || false,
          updatedAt: new Date()
        }
      });

      console.log(`Novo comentário no chamado ${ticketId} por ${authorName}`);

      res.status(201).json({
        success: true,
        comment
      });

    } else {
      res.status(405).json({ error: 'Method not allowed' });
    }

  } catch (error) {
    console.error('Erro na API de comentários:', error);
    res.status(500).json({ 
      error: 'Erro interno do servidor',
      details: process.env.NODE_ENV === 'development' ? error : undefined
    });
  } finally {
    await prisma.$disconnect();
  }
}