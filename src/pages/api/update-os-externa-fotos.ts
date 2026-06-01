import { PrismaClient } from '@prisma/client';
import { NextApiRequest, NextApiResponse } from 'next';
import { requireAuth } from "@/utils/api-auth";

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  // Requer autenticação
  const auth = await requireAuth(req, res);
  if (!auth) return;

  }

  try {
    const { numeroOs, fotosAntes, fotosDepois } = req.body;



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