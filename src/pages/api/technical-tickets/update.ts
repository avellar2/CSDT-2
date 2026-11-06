import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';
import { generateStatusChangeEmail } from '@/utils/emailTemplates';
import { requireAuth } from "@/utils/api-auth";
import {
  dateKeyFromPrismaDate,
  getRouteIdsForTechnician,
  isRouteManager,
  isValidDateKey,
  routeStatusIsOpen,
} from "@/utils/operationalRoutes";

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const auth = await requireAuth(req, res);
  if (!auth) return;

  if (req.method !== 'PUT') {
    res.setHeader('Allow', ['PUT']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { ticketId } = req.query;
    const {
      status,
      priority,
      assignedTo,
      scheduledDate,
      scheduledTime,
      notes,
      eventId,
      routeId,
    } = req.body;

    if (!ticketId) {
      return res.status(400).json({ error: 'ID do chamado é obrigatório' });
    }

    // Buscar chamado atual
    const currentTicket = await prisma.technicalTicket.findUnique({
      where: { id: parseInt(ticketId as string) },
      include: { School: true }
    });

    if (!currentTicket) {
      return res.status(404).json({ error: 'Chamado não encontrado' });
    }

    // Técnicos só alteram chamados destinados à própria rota.
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
        return res.status(403).json({
          error: 'Este chamado pertence a outra rota.',
        });
      }

      if (technicianRouteIds.length === 0 && anyRoutes > 0) {
        return res.status(403).json({
          error: 'Você não participa de nenhuma rota ativa.',
        });
      }
    }

    // Preparar dados para atualização
    const updateData: Record<string, unknown> = {};

    if (status !== undefined) updateData.status = status;
    if (priority !== undefined) updateData.priority = priority;
    if (assignedTo !== undefined) updateData.assignedTo = assignedTo;
    if (notes !== undefined) updateData.notes = notes;
    if (eventId !== undefined) updateData.eventId = eventId;

    if (scheduledDate) {
      updateData.scheduledDate = new Date(scheduledDate);
    }
    if (scheduledTime) {
      updateData.scheduledTime = scheduledTime;
    }

    const parsedRouteId =
      routeId === null || routeId === undefined || routeId === ''
        ? undefined
        : Number(routeId);

    if (
      parsedRouteId !== undefined &&
      (!Number.isInteger(parsedRouteId) || parsedRouteId <= 0)
    ) {
      return res.status(400).json({ error: 'routeId inválido' });
    }

    if (parsedRouteId !== undefined) {
      if (!isRouteManager(auth.profile.role)) {
        return res.status(403).json({
          error: 'Somente ADMIN ou ADMTOTAL podem transferir chamados entre rotas.',
        });
      }

      const route = await prisma.dailyRoute.findUnique({
        where: { id: parsedRouteId },
        select: { id: true, date: true, status: true },
      });

      if (!route) {
        return res.status(404).json({ error: 'Rota não encontrada' });
      }

      if (!routeStatusIsOpen(route.status)) {
        return res.status(409).json({ error: 'A rota está encerrada.' });
      }

      const ticketDate = scheduledDate
        ? (isValidDateKey(scheduledDate) ? scheduledDate : null)
        : currentTicket.scheduledDate
          ? dateKeyFromPrismaDate(currentTicket.scheduledDate)
          : null;

      if (!ticketDate || dateKeyFromPrismaDate(route.date) !== ticketDate) {
        return res.status(400).json({
          error: 'A data do chamado deve ser a mesma data da rota.',
        });
      }

      updateData.routeId = parsedRouteId;
    }

    const updatedTicket = await prisma.$transaction(async (tx) => {
      const updated = await tx.technicalTicket.update({
        where: { id: parseInt(ticketId as string) },
        data: updateData,
        include: {
          School: true,
          ScheduleEvent: true
        }
      });

      if (parsedRouteId !== undefined && parsedRouteId !== currentTicket.routeId) {
        await tx.routeTransfer.create({
          data: {
            entityType: 'TECHNICAL_TICKET',
            entityId: currentTicket.id,
            fromRouteId: currentTicket.routeId,
            toRouteId: parsedRouteId,
            movedBy: auth.id,
            note: 'Alteração via atualização do chamado',
          },
        });
      }

      return updated;
    });

    // Enviar notificação por email se o status mudou
    if (status && status !== currentTicket.status && currentTicket.School.email) {
      try {
        const statusMessages = {
          'IN_PROGRESS': 'Seu chamado técnico foi iniciado! Nossa equipe já começou a trabalhar no seu problema.',
          'RESOLVED': 'Seu chamado técnico foi resolvido! O problema foi solucionado pela nossa equipe.',
          'CLOSED': 'Seu chamado técnico foi finalizado. Agradecemos pela confiança em nossos serviços.',
          'CANCELLED': 'Seu chamado técnico foi cancelado. Entre em contato conosco se tiver dúvidas.'
        };

        const emailData = {
          schoolName: currentTicket.School.name,
          ticketId: currentTicket.id,
          ticketTitle: currentTicket.title,
          newStatus: status,
          responsibleName: assignedTo || currentTicket.assignedTo || 'Equipe CSDT',
          statusMessage: statusMessages[status as keyof typeof statusMessages] || `Status do chamado alterado para: ${status}`,
          scheduledDate: scheduledDate || currentTicket.scheduledDate?.toISOString().split('T')[0],
          scheduledTime: scheduledTime || currentTicket.scheduledTime,
          notes: notes || updatedTicket.notes
        };

        const emailTemplate = generateStatusChangeEmail(emailData);

        const emailResponse = await fetch(`${req.headers.origin || 'http://localhost:3000'}/api/send-email`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            to: currentTicket.School.email,
            subject: emailTemplate.subject,
            html: emailTemplate.html,
            text: emailTemplate.text
          })
        });

        if (!emailResponse.ok) {
          console.error('Erro ao enviar email de atualização:', await emailResponse.text());
        }
      } catch (emailError) {
        console.error('Erro ao enviar email de atualização:', emailError);
        // Não falhar a atualização se o email não for enviado
      }
    }

    res.status(200).json({
      success: true,
      ticket: updatedTicket,
      message: 'Chamado atualizado com sucesso!' + (status && status !== currentTicket.status ? ' Email de notificação enviado para a escola.' : '')
    });

  } catch (error) {
    console.error('Erro ao atualizar chamado técnico:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      details: process.env.NODE_ENV === 'development' ? error : undefined
    });
  } finally {
    await prisma.$disconnect();
  }
}
