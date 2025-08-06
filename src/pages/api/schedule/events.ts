import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      const { start, end } = req.query;

      let where = {};
      if (start && end) {
        where = {
          OR: [
            {
              startDate: {
                gte: new Date(start as string),
                lte: new Date(end as string)
              }
            },
            {
              endDate: {
                gte: new Date(start as string), 
                lte: new Date(end as string)
              }
            },
            {
              AND: [
                { startDate: { lte: new Date(start as string) } },
                { endDate: { gte: new Date(end as string) } }
              ]
            }
          ]
        };
      }

      const events = await prisma.scheduleEvent.findMany({
        where,
        include: {
          School: true
        },
        orderBy: {
          startDate: 'asc'
        }
      });

      res.status(200).json(events);
    } catch (error) {
      console.error('Erro ao buscar eventos:', error);
      res.status(500).json({ error: 'Erro ao buscar eventos' });
    } finally {
      await prisma.$disconnect();
    }
  }

  else if (req.method === 'POST') {
    try {
      const {
        title,
        description,
        startDate,
        endDate,
        allDay,
        type,
        priority,
        status,
        createdBy,
        assignedTo,
        location,
        schoolId,
        recurring,
        recurrence,
        reminders,
        attachments,
        tags
      } = req.body;

      const event = await prisma.scheduleEvent.create({
        data: {
          title,
          description,
          startDate: new Date(startDate),
          endDate: new Date(endDate),
          allDay: allDay || false,
          type: type || 'TASK',
          priority: priority || 'MEDIUM',
          status: status || 'PENDING',
          createdBy,
          assignedTo,
          location,
          schoolId: schoolId ? parseInt(schoolId) : null,
          recurring: recurring || false,
          recurrence,
          reminders,
          attachments: attachments || [],
          tags: tags || []
        },
        include: {
          School: true
        }
      });

      res.status(201).json(event);
    } catch (error) {
      console.error('Erro ao criar evento:', error);
      res.status(500).json({ error: 'Erro ao criar evento' });
    } finally {
      await prisma.$disconnect();
    }
  }

  else if (req.method === 'PUT') {
    try {
      const { id } = req.query;
      const {
        title,
        description,
        startDate,
        endDate,
        allDay,
        type,
        priority,
        status,
        assignedTo,
        location,
        schoolId,
        recurring,
        recurrence,
        reminders,
        attachments,
        tags
      } = req.body;

      const event = await prisma.scheduleEvent.update({
        where: { id: parseInt(id as string) },
        data: {
          title,
          description,
          startDate: startDate ? new Date(startDate) : undefined,
          endDate: endDate ? new Date(endDate) : undefined,
          allDay,
          type,
          priority,
          status,
          assignedTo,
          location,
          schoolId: schoolId ? parseInt(schoolId) : null,
          recurring,
          recurrence,
          reminders,
          attachments,
          tags
        },
        include: {
          School: true
        }
      });

      res.status(200).json(event);
    } catch (error) {
      console.error('Erro ao atualizar evento:', error);
      res.status(500).json({ error: 'Erro ao atualizar evento' });
    } finally {
      await prisma.$disconnect();
    }
  }

  else if (req.method === 'DELETE') {
    try {
      const { id } = req.query;

      await prisma.scheduleEvent.delete({
        where: { id: parseInt(id as string) }
      });

      res.status(200).json({ message: 'Evento excluído com sucesso' });
    } catch (error) {
      console.error('Erro ao excluir evento:', error);
      res.status(500).json({ error: 'Erro ao excluir evento' });
    } finally {
      await prisma.$disconnect();
    }
  }

  else {
    res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
    res.status(405).json({ error: `Método ${req.method} não permitido` });
  }
}