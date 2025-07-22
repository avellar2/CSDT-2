import { PrismaClient } from '@prisma/client';
import { NextApiRequest, NextApiResponse } from 'next';

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    const { numeroOs, fotosAntes, fotosDepois } = req.body;

    console.log('Atualizando fotos para OS:', numeroOs);
    console.log('Fotos antes:', fotosAntes);
    console.log('Fotos depois:', fotosDepois);

    // Buscar a OS pelo número
    const osExistente = await prisma.oSExterna.findFirst({
      where: {
        numeroOs: numeroOs
      }
    });

    if (!osExistente) {
      return res.status(404).json({ error: 'OS não encontrada' });
    }

    // Atualizar as URLs das fotos
    const updatedOs = await prisma.oSExterna.update({
      where: {
        id: osExistente.id
      },
      data: {
        fotosAntes: fotosAntes || [],
        fotosDepois: fotosDepois || [],
      },
    });

    console.log('OS atualizada com sucesso:', updatedOs.id);
    res.status(200).json({
      success: true,
      message: 'Fotos atualizadas com sucesso',
      fotosAntes: updatedOs.fotosAntes,
      fotosDepois: updatedOs.fotosDepois
    });
  } catch (error) {
    console.error('Erro ao atualizar fotos:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  } finally {
    await prisma.$disconnect();
  }
}