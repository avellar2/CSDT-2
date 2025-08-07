import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { schoolId } = req.query;

    if (!schoolId) {
      return res.status(400).json({ error: 'schoolId é obrigatório' });
    }

    // Buscar chamados excluídos da escola
    const deletedTickets = await prisma.technicalTicket.findMany({
      where: {
        schoolId: parseInt(schoolId as string),
        status: 'DELETED'
      },
      include: {
        School: true
      },
      orderBy: {
        deletedAt: 'desc'
      }
    });

    res.status(200).json({
      success: true,
      deletedTickets,
      count: deletedTickets.length
    });

  } catch (error) {
    console.error('Erro ao buscar chamados excluídos:', error);
    res.status(500).json({ 
      error: 'Erro interno do servidor',
      details: process.env.NODE_ENV === 'development' ? error : undefined
    });
  } finally {
    await prisma.$disconnect();
  }
}