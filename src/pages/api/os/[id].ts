import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;

  try {
    const os = await prisma.os.findUnique({
      where: {
        id: parseInt(id as string, 10),
      },
    });

    if (!os) {
      return res.status(404).json({ error: 'OS não encontrada' });
    }

    res.status(200).json(os);
  } catch (error) {
    console.error('Erro ao buscar OS:', error);
    res.status(500).json({ error: 'Erro ao buscar OS' });
  } finally {
    await prisma.$disconnect();
  }
}