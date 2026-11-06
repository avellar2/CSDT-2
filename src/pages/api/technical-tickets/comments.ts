import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';
import { requireAuth } from "@/utils/api-auth";
import {
  loadTicketAccessContext,
  technicianCanAccessTicket,
} from "@/utils/operationalRoutes";

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Requer autenticação
  const auth = await requireAuth(req, res);
  if (!auth) return;

  try {
    const { ticketId } = req.query;

    if (!ticketId) {
      return res.status(400).json({ error: 'ID do chamado é obrigatório' });
    }

    const parsedTicketId = Number(ticketId);
    if (!Number.isInteger(parsedTicketId) || parsedTicketId <= 0) {
      return res.status(400).json({ error: 'ID do chamado inválido' });
    }

    const ticket = await prisma.technicalTicket.findUnique({
      where: { id: parsedTicketId },
      select: {
        id: true,
        schoolId: true,
        routeId: true,
        scheduledDate: true
      }
    });

    if (!ticket) {
      return res.status(404).json({ error: 'Chamado não encontrado' });
    }

    // Separação por rota aplicada no backend (mesma regra da listagem).
    if (auth.profile.role === 'TECH') {
      const access = await loadTicketAccessContext(auth.profile.id);

      if (
        !technicianCanAccessTicket(access, {
          routeId: ticket.routeId,
          scheduledDate: ticket.scheduledDate
        })
      ) {
        return res.status(403).json({ error: 'Este chamado pertence a outra rota.' });
      }
    }

    // Usuário de escola só acessa chamados da própria escola.
    if (
      auth.profile.role === 'SCHOOL' &&
      auth.profile.schoolId !== null &&
      ticket.schoolId !== auth.profile.schoolId
    ) {
      return res.status(403).json({ error: 'Você não tem acesso a este chamado.' });
    }

    if (req.method === 'GET') {
      // Listar comentários do chamado
      const comments = await prisma.ticketComment.findMany({
        where: { ticketId: parsedTicketId },
        orderBy: { createdAt: 'asc' }
      });

      res.status(200).json({
        success: true,
        comments
      });

    } else if (req.method === 'POST') {
      // Criar novo comentário
      const { content, isInternal } = req.body || {};

      if (!content || !String(content).trim()) {
        return res.status(400).json({
          error: 'Campo obrigatório: content'
        });
      }

      // Autor vem da sessão autenticada, nunca do corpo da requisição.
      const comment = await prisma.ticketComment.create({
        data: {
          ticketId: parsedTicketId,
          authorId: auth.id,
          authorName: auth.profile.displayName,
          authorRole: auth.profile.role,
          content: String(content).trim(),
          isInternal: isInternal || false,
          updatedAt: new Date()
        }
      });

      res.status(201).json({
        success: true,
        comment
      });

    } else {
      res.setHeader('Allow', ['GET', 'POST']);
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
