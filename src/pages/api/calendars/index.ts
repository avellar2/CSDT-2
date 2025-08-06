import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      const { ownerId } = req.query;

      const calendars = await prisma.calendar.findMany({
        where: ownerId ? { ownerId: ownerId as string } : {},
        include: {
          _count: {
            select: { events: true }
          }
        },
        orderBy: [
          { isDefault: 'desc' },
          { name: 'asc' }
        ]
      });

      res.status(200).json(calendars);
    } catch (error) {
      console.error('Erro ao buscar calendários:', error);
      res.status(500).json({ error: 'Erro ao buscar calendários' });
    } finally {
      await prisma.$disconnect();
    }
  }

  else if (req.method === 'POST') {
    try {
      const {
        name,
        description,
        color,
        isVisible,
        isDefault,
        ownerId,
        isPublic,
        timezone
      } = req.body;

      // Se é padrão, marcar outros como não-padrão
      if (isDefault) {
        await prisma.calendar.updateMany({
          where: { ownerId },
          data: { isDefault: false }
        });
      }

      const calendar = await prisma.calendar.create({
        data: {
          name,
          description,
          color: color || '#3b82f6',
          isVisible: isVisible !== false,
          isDefault: isDefault || false,
          ownerId,
          isPublic: isPublic || false,
          timezone: timezone || 'America/Sao_Paulo'
        },
        include: {
          _count: {
            select: { events: true }
          }
        }
      });

      res.status(201).json(calendar);
    } catch (error) {
      console.error('Erro ao criar calendário:', error);
      res.status(500).json({ error: 'Erro ao criar calendário' });
    } finally {
      await prisma.$disconnect();
    }
  }

  else {
    res.setHeader('Allow', ['GET', 'POST']);
    res.status(405).json({ error: `Método ${req.method} não permitido` });
  }
}