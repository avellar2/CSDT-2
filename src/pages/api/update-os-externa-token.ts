import { PrismaClient } from '@prisma/client';
import { NextApiRequest, NextApiResponse } from 'next';

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    const { numeroOs, assinado } = req.body;

    // Buscar a OS pelo número
    const osExistente = await prisma.oSExterna.findFirst({
      where: {
        numeroOs: numeroOs
      }
    });

    if (!osExistente) {
      return res.status(404).json({ error: 'OS não encontrada' });
    }

    // Atualizar o token de confirmação
    const updatedOs = await prisma.oSExterna.update({
      where: {
        id: osExistente.id
      },
      data: {
        assinado: assinado,
      },
    });

    res.status(200).json({
      success: true,
      message: 'Token atualizado com sucesso'
    });
  } catch (error) {
    console.error('Erro ao atualizar token:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  } finally {
    await prisma.$disconnect();
  }
}