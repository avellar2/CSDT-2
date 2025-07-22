import { PrismaClient } from '@prisma/client';
import { NextApiRequest, NextApiResponse } from 'next';

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    const osExternas = await prisma.oSExterna.findMany({
      orderBy: [
        { status: 'asc' }, // Pendente primeiro
        { createdAt: 'desc' } // Mais recentes primeiro
      ]
    });

    console.log('OS Externas encontradas:', osExternas.length); // Debug
    console.log('Primeira OS:', osExternas[0]); // Debug

    res.status(200).json(osExternas);
  } catch (error) {
    console.error('Erro ao buscar OS Externas:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  } finally {
    await prisma.$disconnect();
  }
}