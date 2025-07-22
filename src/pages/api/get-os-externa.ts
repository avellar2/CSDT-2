import { PrismaClient } from '@prisma/client';
import { NextApiRequest, NextApiResponse } from 'next';

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    const { numeroOs, token } = req.query;

    if (!numeroOs || !token) {
      return res.status(400).json({ error: 'Número da OS e token são obrigatórios' });
    }

    // Buscar a OS pelo número e token
    const osExterna = await prisma.oSExterna.findFirst({
      where: {
        numeroOs: numeroOs as string,
        assinado: token as string,
        status: "Pendente" // Só permite confirmar OS que ainda estão pendentes
      },
      select: {
        id: true,
        numeroOs: true,
        unidadeEscolar: true,
        tecnicoResponsavel: true,
        data: true,
        hora: true,
        status: true,
        assinado: true
      }
    });

    if (!osExterna) {
      return res.status(404).json({ error: 'OS não encontrada, token inválido ou OS já confirmada' });
    }

    res.status(200).json(osExterna);
  } catch (error) {
    console.error('Erro ao buscar OS Externa:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  } finally {
    await prisma.$disconnect();
  }
}