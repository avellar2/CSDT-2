import { PrismaClient } from '@prisma/client';
import { NextApiRequest, NextApiResponse } from 'next';

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    const { numeroOs, token, motivo } = req.body;

    if (!numeroOs || !token) {
      return res.status(400).json({ error: 'Número da OS e token são obrigatórios' });
    }

    if (!motivo || motivo.trim().length === 0) {
      return res.status(400).json({ error: 'O motivo da recusa é obrigatório' });
    }

    const osExterna = await prisma.oSExterna.findFirst({
      where: {
        numeroOs: numeroOs,
        assinado: token,
        status: "Pendente",
      },
    });

    if (!osExterna) {
      return res.status(404).json({
        error: 'OS não encontrada, token inválido ou OS já confirmada',
      });
    }

    await prisma.oSExterna.update({
      where: { id: osExterna.id },
      data: {
        motivoRecusa: motivo.trim(),
        recusadoEm: new Date(),
        updatedAt: new Date(),
      },
    });

    res.status(200).json({
      success: true,
      message: 'OS recusada com sucesso',
      numeroOs: osExterna.numeroOs,
    });
  } catch (error) {
    console.error('Erro ao recusar OS Externa:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      details: error instanceof Error ? error.message : 'Erro desconhecido',
    });
  } finally {
    await prisma.$disconnect();
  }
}