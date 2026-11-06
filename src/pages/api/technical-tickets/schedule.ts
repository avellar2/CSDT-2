import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';
import { generateTicketAcceptedEmail } from '@/utils/emailTemplates';
import { requireAuth } from "@/utils/api-auth";
import {
  dateKeyFromPrismaDate,
  isRouteManager,
  isValidDateKey,
  loadTicketAccessContext,
  routeStatusIsOpen,
  technicianCanAccessTicket,
} from "@/utils/operationalRoutes";

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const auth = await requireAuth(req, res);
  if (!auth) return;

  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const {
      ticketId,
      scheduledDate,
      scheduledTime,
      assignedTo,
      priority,
      notes,
      calendarId,
      routeId,
    } = req.body;

    if (!ticketId || !scheduledDate || !scheduledTime || !assignedTo) {
      return res.status(400).json({
        error: 'Campos obrigatórios: ticketId, scheduledDate, scheduledTime, assignedTo'
      });
    }

    if (!isValidDateKey(scheduledDate)) {
      return res.status(400).json({ error: 'scheduledDate deve estar no formato YYYY-MM-DD' });
    }

    const parsedRouteId =
      routeId === null || routeId === undefined || routeId === ''
        ? null
        : Number(routeId);

    if (
      parsedRouteId !== null &&
      (!Number.isInteger(parsedRouteId) || parsedRouteId <= 0)
    ) {
      return res.status(400).json({ error: 'routeId inválido' });
    }

    // Buscar o chamado
    const ticket = await prisma.technicalTicket.findUnique({
      where: { id: parseInt(ticketId) },
      include: { School: true }
    });

    if (!ticket) {
      return res.status(404).json({ error: 'Chamado não encontrado' });
    }

    // Autorização aplicada no backend, a partir do usuário autenticado.
    // Um técnico só agenda chamados da própria equipe e nunca transfere um
    // chamado de outra rota (nem o devolve para a fila administrativa).
    if (!isRouteManager(auth.profile.role)) {
      if (auth.profile.role !== 'TECH') {
        return res.status(403).json({
          error: 'Somente técnicos e administradores podem agendar chamados.'
        });
      }

      const access = await loadTicketAccessContext(auth.profile.id);

      if (
        !technicianCanAccessTicket(access, {
          routeId: ticket.routeId,
          scheduledDate: ticket.scheduledDate,
        })
      ) {
        return res.status(403).json({ error: 'Este chamado pertence a outra rota.' });
      }

      if (parsedRouteId !== null) {
        if (!access.routeIds.includes(parsedRouteId)) {
          return res.status(403).json({
            error: 'Você só pode agendar chamados em rotas das quais participa.'
          });
        }
      } else if (ticket.routeId !== null) {
        return res.status(403).json({
          error: 'Somente ADMIN ou ADMTOTAL podem remover o chamado da rota.'
        });
      } else if (access.daysWithRoutes.includes(scheduledDate)) {
        return res.status(400).json({
          error: 'Existem rotas nesta data. Selecione a sua rota para agendar o chamado.'
        });
      }
    }

    if (parsedRouteId !== null) {
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

      if (dateKeyFromPrismaDate(route.date) !== scheduledDate) {
        return res.status(400).json({
          error: 'A data de agendamento deve ser a mesma data da rota.',
        });
      }
    }

    // Criar evento na agenda (horário interpretado em America/Sao_Paulo)
    const startDate = new Date(`${scheduledDate}T${scheduledTime}:00-03:00`);
    const endDate = new Date(startDate);
    endDate.setHours(endDate.getHours() + 2); // 2 horas de duração padrão

    const { event, updatedTicket } = await prisma.$transaction(async (tx) => {
      const createdEvent = await tx.scheduleEvent.create({
        data: {
          title: `Chamado Técnico: ${ticket.title}`,
          description: `Chamado #${ticket.id}\n\nEscola: ${ticket.School.name}\n\nDescrição: ${ticket.description}\n\n${notes ? `Observações: ${notes}` : ''}`,
          startDate,
          endDate,
          allDay: false,
          type: 'APPOINTMENT',
          priority: priority || 'MEDIUM',
          status: 'PENDING',
          createdBy: assignedTo,
          assignedTo,
          location: ticket.School.name,
          schoolId: ticket.schoolId,
          calendarId: calendarId || 1, // Usar calendário padrão se não especificado
          tags: ['chamado-tecnico', ticket.category.toLowerCase()],
          updatedAt: new Date()
        }
      });

      const updated = await tx.technicalTicket.update({
        where: { id: parseInt(ticketId) },
        data: {
          status: 'SCHEDULED',
          assignedTo,
          priority: priority || ticket.priority,
          scheduledDate: startDate,
          scheduledTime,
          eventId: createdEvent.id,
          notes: notes || ticket.notes,
          routeId: parsedRouteId,
        },
        include: {
          School: true,
          ScheduleEvent: true
        }
      });

      if (ticket.routeId !== parsedRouteId) {
        await tx.routeTransfer.create({
          data: {
            entityType: 'TECHNICAL_TICKET',
            entityId: ticket.id,
            fromRouteId: ticket.routeId,
            toRouteId: parsedRouteId,
            movedBy: auth.id,
            note: 'Definido no agendamento do chamado',
          },
        });
      }

      return { event: createdEvent, updatedTicket: updated };
    });

    // Enviar email de notificação para a escola
    try {
      const emailData = {
        schoolName: ticket.School.name,
        ticketId: ticket.id,
        ticketTitle: ticket.title,
        ticketDescription: ticket.description,
        scheduledDate: scheduledDate,
        scheduledTime: scheduledTime,
        responsibleName: assignedTo,
        notes: notes
      };

      const emailTemplate = generateTicketAcceptedEmail(emailData);
      
      // Usar o email real da escola ou um padrão se não estiver cadastrado
      const schoolEmail = ticket.School.email || `contato@${ticket.School.name.toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9]/g, '')}.edu.br`;
      
      // Log para debug

      // Se não há email cadastrado, não tentar enviar
      if (!ticket.School.email) {

      }
      
      const emailResponse = await fetch(`${req.headers.origin || 'http://localhost:3000'}/api/send-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: schoolEmail,
          subject: emailTemplate.subject,
          html: emailTemplate.html,
          text: emailTemplate.text
        })
      });

      if (emailResponse.ok) {

      } else {
        console.error('Erro ao enviar email de notificação:', await emailResponse.text());
      }
    } catch (emailError) {
      console.error('Erro ao enviar email de notificação:', emailError);
      // Não falhar o agendamento se o email não for enviado
    }

    res.status(200).json({
      success: true,
      ticket: updatedTicket,
      event,
      message: 'Chamado agendado com sucesso! Email de notificação enviado para a escola.'
    });

  } catch (error) {
    console.error('Erro ao agendar chamado técnico:', error);
    res.status(500).json({ 
      error: 'Erro interno do servidor',
      details: process.env.NODE_ENV === 'development' ? error : undefined
    });
  } finally {
    await prisma.$disconnect();
  }
}