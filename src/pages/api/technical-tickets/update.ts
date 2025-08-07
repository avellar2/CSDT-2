import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';
import { generateStatusChangeEmail } from '@/utils/emailTemplates';

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'PUT') {
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
      updatedBy // Quem está fazendo a atualização
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

    // Preparar dados para atualização
    const updateData: any = {};
    
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

    // Atualizar chamado
    const updatedTicket = await prisma.technicalTicket.update({
      where: { id: parseInt(ticketId as string) },
      data: updateData,
      include: {
        School: true,
        Event: true
      }
    });

    console.log(`Chamado técnico atualizado: ${updatedTicket.id} - Status: ${updatedTicket.status}`);

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

        if (emailResponse.ok) {
          console.log(`Email de atualização enviado para: ${currentTicket.School.email}`);
        } else {
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