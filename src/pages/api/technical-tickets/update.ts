import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';
import { generateStatusChangeEmail } from '@/utils/emailTemplates';
import { requireAuth, canOperateTickets } from "@/utils/api-auth";
import {
  dateKeyFromPrismaDate,
  isRouteManager,
  isValidDateKey,
  loadTicketAccessContext,
  prismaDateTimeFromDateKey,
  routeStatusIsOpen,
  technicianCanAccessTicket,
  ticketDateKey,
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

    // ONLYREAD é somente leitura e SCHOOL apenas abre/acompanha os próprios
    // chamados: nenhum dos dois opera chamados técnicos.
    if (!canOperateTickets(auth.profile.role)) {
      return res.status(403).json({
        error: 'Perfil sem permissão para atualizar chamados técnicos.',
      });
    }

    // Buscar chamado atual
    const currentTicket = await prisma.technicalTicket.findUnique({
      where: { id: parseInt(ticketId as string) },
      include: { School: true }
    });

    if (!currentTicket) {
      return res.status(404).json({ error: 'Chamado não encontrado' });
    }

    // Técnicos só alteram chamados destinados à própria equipe. A decisão usa
    // a data operacional do chamado, não a existência global de rotas.
    if (!isRouteManager(auth.profile.role) && auth.profile.role === 'TECH') {
      const access = await loadTicketAccessContext(auth.profile.id);

      if (
        !technicianCanAccessTicket(access, {
          routeId: currentTicket.routeId,
          scheduledDate: currentTicket.scheduledDate,
        })
      ) {
        return res.status(403).json({
          error: 'Este chamado pertence a outra rota.',
        });
      }

      // Reagendar para outro dia altera a rota responsável: só a administração.
      if (currentTicket.routeId !== null && scheduledDate) {
        const currentDateKey = ticketDateKey(currentTicket.scheduledDate);
        const nextDateKey = isValidDateKey(scheduledDate)
          ? scheduledDate
          : ticketDateKey(new Date(scheduledDate));

        if (currentDateKey !== null && currentDateKey !== nextDateKey) {
          return res.status(403).json({
            error:
              'Somente ADMIN ou ADMTOTAL podem reagendar um chamado com rota para outra data.',
          });
        }
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
      // "YYYY-MM-DD" precisa virar meio-dia em America/Sao_Paulo; um ISO
      // completo é respeitado como veio.
      updateData.scheduledDate = isValidDateKey(scheduledDate)
        ? prismaDateTimeFromDateKey(scheduledDate)
        : new Date(scheduledDate);
    }
    if (scheduledTime) {
      updateData.scheduledTime = scheduledTime;
    }

    // Data operacional (America/Sao_Paulo) que o chamado terá após o update.
    const requestedDateKey: string | null = scheduledDate
      ? isValidDateKey(scheduledDate)
        ? scheduledDate
        : ticketDateKey(new Date(scheduledDate))
      : ticketDateKey(currentTicket.scheduledDate);

    // `routeId` ausente significa "não alterar"; `routeId: null` (ou vazio)
    // remove o chamado da rota e devolve à fila administrativa. As duas
    // operações são exclusivas de ADMIN/ADMTOTAL.
    const routeIdProvided = Object.prototype.hasOwnProperty.call(
      req.body,
      'routeId'
    );
    const parsedRouteId = !routeIdProvided
      ? undefined
      : routeId === null || routeId === ''
        ? null
        : Number(routeId);

    if (
      parsedRouteId !== undefined &&
      parsedRouteId !== null &&
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

      if (parsedRouteId === null) {
        updateData.routeId = null;
      } else {
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

        if (!requestedDateKey || dateKeyFromPrismaDate(route.date) !== requestedDateKey) {
          return res.status(400).json({
            error: 'A data do chamado deve ser a mesma data da rota.',
          });
        }

        updateData.routeId = parsedRouteId;
      }
    }

    // Reagendar sem informar rota: um chamado não pode continuar vinculado a
    // uma rota de outra data. Nesse caso ele volta para a fila administrativa
    // e a movimentação é auditada (a administração pode vinculá-lo a uma rota
    // válida depois).
    let autoUnassigned = false;
    if (
      !routeIdProvided &&
      currentTicket.routeId !== null &&
      scheduledDate &&
      requestedDateKey !== null
    ) {
      const currentRoute = await prisma.dailyRoute.findUnique({
        where: { id: currentTicket.routeId },
        select: { date: true },
      });

      const routeDateKey = currentRoute
        ? dateKeyFromPrismaDate(currentRoute.date)
        : null;

      if (routeDateKey !== requestedDateKey) {
        updateData.routeId = null;
        autoUnassigned = true;
      }
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

      const finalRouteId =
        updateData.routeId !== undefined
          ? (updateData.routeId as number | null)
          : currentTicket.routeId;

      if (finalRouteId !== currentTicket.routeId) {
        await tx.routeTransfer.create({
          data: {
            entityType: 'TECHNICAL_TICKET',
            entityId: currentTicket.id,
            fromRouteId: currentTicket.routeId,
            toRouteId: finalRouteId,
            movedBy: auth.id,
            note: autoUnassigned
              ? 'Reagendamento para data diferente da rota'
              : 'Alteração via atualização do chamado',
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
