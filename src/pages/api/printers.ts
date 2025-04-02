import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    const printers = await prisma.printer.findMany();
    res.status(200).json(printers);
  } catch (error) {
    console.error('Erro ao buscar impressoras:', error);
    res.status(500).json({ error: 'Erro ao buscar impressoras' });
  } finally {
    await prisma.$disconnect();
  }
};