import { PrismaClient } from '@prisma/client';
import { NextApiRequest, NextApiResponse } from 'next';

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    const { userId, status } = req.query;
    let tecnicoResponsavelFilter: string | undefined;

    if (userId && typeof userId === 'string') {
      const profile = await prisma.profile.findUnique({
        where: { userId },
        select: { role: true, displayName: true },
      });

      if (profile?.role === 'TECH') {
        tecnicoResponsavelFilter = profile.displayName;
      }
    }

    const osExternas = await prisma.oSExterna.findMany({
      where: {
        ...(tecnicoResponsavelFilter ? { tecnicoResponsavel: tecnicoResponsavelFilter } : {}),
        ...(status && typeof status === 'string' ? { status } : {}),
      },
      orderBy: [
        { status: 'asc' },
        { createdAt: 'desc' },
      ],
    });

    res.status(200).json(osExternas);
  } catch (error) {
    console.error('Erro ao buscar OS Externas:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      details: error instanceof Error ? error.message : 'Erro desconhecido',
    });
  } finally {
    await prisma.$disconnect();
  }
}
