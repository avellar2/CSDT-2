import type { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const printerRequests = await prisma.printerRequest.findMany({
      include: {
        School: {
          select: {
            id: true,
            name: true,
            email: true,
            district: true,
          },
        },
        printers: true,
      },
      orderBy: {
        sentAt: 'desc',
      },
    });

    res.status(200).json(printerRequests);
  } catch (error) {
    console.error('Erro ao listar solicitações:', error);
    res.status(500).json({ error: 'Erro ao listar solicitações' });
  } finally {
    await prisma.$disconnect();
  }
}
