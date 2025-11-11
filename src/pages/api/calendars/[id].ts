import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;
  const calendarId = parseInt(id as string);

  if (req.method === 'PUT') {
    try {
      const {
        name,
        description,
        color,
        isVisible,
        isDefault,
        timezone
      } = req.body;

      // Se está marcando como padrão, desmarcar outros
      if (isDefault) {
        const calendar = await prisma.calendar.findUnique({
          where: { id: calendarId },
          select: { ownerId: true }
        });

        if (calendar) {
          await prisma.calendar.updateMany({
            where: { 
              ownerId: calendar.ownerId,
              id: { not: calendarId }
            },
            data: { isDefault: false }
          });
        }
      }

      const updatedCalendar = await prisma.calendar.update({
        where: { id: calendarId },
        data: {
          name,
          description,
          color,
          isVisible,
          isDefault,
          timezone
        },
        include: {
          _count: {
            select: { ScheduleEvent: true }
          }
        }
      });

      res.status(200).json(updatedCalendar);
    } catch (error) {
      console.error('Erro ao atualizar calendário:', error);
      res.status(500).json({ error: 'Erro ao atualizar calendário' });
    } finally {
      await prisma.$disconnect();
    }
  }

  else if (req.method === 'DELETE') {
    try {
      // Verificar se não é o único calendário do usuário
      const calendar = await prisma.calendar.findUnique({
        where: { id: calendarId },
        select: { ownerId: true }
      });

      if (calendar) {
        const userCalendarsCount = await prisma.calendar.count({
          where: { ownerId: calendar.ownerId }
        });

        if (userCalendarsCount <= 1) {
          return res.status(400).json({ error: 'Não é possível excluir o único calendário' });
        }
      }

      await prisma.calendar.delete({
        where: { id: calendarId }
      });

      res.status(200).json({ message: 'Calendário excluído com sucesso' });
    } catch (error) {
      console.error('Erro ao excluir calendário:', error);
      res.status(500).json({ error: 'Erro ao excluir calendário' });
    } finally {
      await prisma.$disconnect();
    }
  }

  else if (req.method === 'PATCH') {
    // Toggle visibility
    try {
      const { isVisible } = req.body;

      const updatedCalendar = await prisma.calendar.update({
        where: { id: calendarId },
        data: { isVisible },
        include: {
          _count: {
            select: { ScheduleEvent: true }
          }
        }
      });

      res.status(200).json(updatedCalendar);
    } catch (error) {
      console.error('Erro ao alterar visibilidade:', error);
      res.status(500).json({ error: 'Erro ao alterar visibilidade' });
    } finally {
      await prisma.$disconnect();
    }
  }

  else {
    res.setHeader('Allow', ['PUT', 'DELETE', 'PATCH']);
    res.status(405).json({ error: `Método ${req.method} não permitido` });
  }
}