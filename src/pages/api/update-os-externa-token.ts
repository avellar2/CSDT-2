import { PrismaClient } from '@prisma/client';
import { NextApiRequest, NextApiResponse } from 'next';
import { requireAuth } from "@/utils/api-auth";

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Grava o token de confirmação da OS: exige operador autenticado.
  const auth = await requireAuth(req, res);
  if (!auth) return;

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

    // Nunca sobrescreve o token de uma OS já assinada pela escola. Isso
    // protege a assinatura caso o técnico tente retomar uma finalização
    // antiga depois da confirmação.
    if (osExistente.status && osExistente.status !== 'Pendente') {
      return res.status(409).json({
        error: 'Esta OS já foi assinada e não pode receber um novo token de confirmação.',
      });
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