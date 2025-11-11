import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { technicianId } = req.query;

  if (req.method === 'GET') {
    try {
      const { date } = req.query;
      
      const routes = await prisma.routeOptimization.findMany({
        where: {
          technicianId: parseInt(technicianId as string),
          ...(date && { 
            date: {
              gte: new Date(date as string),
              lt: new Date(new Date(date as string).getTime() + 24 * 60 * 60 * 1000)
            }
          })
        },
        include: {
          RouteVisit: {
            include: {
              School: {
                select: {
                  id: true,
                  name: true,
                  address: true,
                  latitude: true,
                  longitude: true
                }
              }
            },
            orderBy: { visitOrder: 'asc' }
          }
        },
        orderBy: { createdAt: 'desc' }
      });

      return res.status(200).json(routes);
    } catch (error) {
      console.error('Erro ao buscar rotas:', error);
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  if (req.method === 'PUT') {
    try {
      const { visitId, status, arrivalTime, departureTime } = req.body;

      const updatedVisit = await prisma.routeVisit.update({
        where: { id: visitId },
        data: {
          status,
          ...(arrivalTime && { arrivalTime: new Date(arrivalTime) }),
          ...(departureTime && { departureTime: new Date(departureTime) })
        }
      });

      return res.status(200).json(updatedVisit);
    } catch (error) {
      console.error('Erro ao atualizar visita:', error);
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  if (req.method === 'DELETE') {
    try {
      const { routeId } = req.body;

      // Remove visits first (foreign key constraint)
      await prisma.routeVisit.deleteMany({
        where: { routeId }
      });

      // Remove route
      await prisma.routeOptimization.delete({
        where: { id: routeId }
      });

      return res.status(200).json({ message: 'Rota removida com sucesso' });
    } catch (error) {
      console.error('Erro ao remover rota:', error);
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  return res.status(405).json({ error: 'Método não permitido' });
}