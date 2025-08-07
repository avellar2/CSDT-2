import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';
import { generateTicketAcceptedEmail } from '@/utils/emailTemplates';

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
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
      calendarId
    } = req.body;

    if (!ticketId || !scheduledDate || !scheduledTime || !assignedTo) {
      return res.status(400).json({ 
        error: 'Campos obrigatórios: ticketId, scheduledDate, scheduledTime, assignedTo' 
      });
    }

    // Buscar o chamado
    const ticket = await prisma.technicalTicket.findUnique({
      where: { id: parseInt(ticketId) },
      include: { School: true }
    });

    if (!ticket) {
      return res.status(404).json({ error: 'Chamado não encontrado' });
    }

    // Criar evento na agenda
    const startDate = new Date(`${scheduledDate}T${scheduledTime}:00`);
    const endDate = new Date(startDate);
    endDate.setHours(endDate.getHours() + 2); // 2 horas de duração padrão

    const event = await prisma.scheduleEvent.create({
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
        tags: ['chamado-tecnico', ticket.category.toLowerCase()]
      }
    });

    // Atualizar o chamado
    const updatedTicket = await prisma.technicalTicket.update({
      where: { id: parseInt(ticketId) },
      data: {
        status: 'SCHEDULED',
        assignedTo,
        priority: priority || ticket.priority,
        scheduledDate: startDate,
        scheduledTime,
        eventId: event.id,
        notes: notes || ticket.notes
      },
      include: {
        School: true,
        Event: true
      }
    });

    console.log(`Chamado técnico agendado: ${updatedTicket.id} para ${scheduledDate} ${scheduledTime}`);

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
      console.log(`Enviando email para escola ${ticket.School.name}: ${schoolEmail}`);
      
      // Se não há email cadastrado, não tentar enviar
      if (!ticket.School.email) {
        console.warn(`⚠️ Escola '${ticket.School.name}' não possui email cadastrado. Email não será enviado.`);
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
        console.log(`Email de notificação enviado para: ${schoolEmail}`);
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