import type { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { id } = req.query;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'ID inválido' });
  }

  try {
    switch (req.method) {
      case 'PATCH':
        return await handlePatch(req, res, parseInt(id));
      default:
        return res.status(405).json({ error: 'Método não permitido' });
    }
  } catch (error) {
    console.error('Erro na API chamados-escala:', error);
    return res.status(500).json({
      error: 'Erro interno do servidor',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  } finally {
    await prisma.$disconnect();
  }
}

async function handlePatch(
  req: NextApiRequest,
  res: NextApiResponse,
  id: number
) {
  const { status, dataAgendamento, observacoes } = req.body;

  const updateData: any = {};

  if (status) updateData.status = status;
  if (dataAgendamento) updateData.dataAgendamento = new Date(dataAgendamento);
  if (observacoes !== undefined) updateData.observacoes = observacoes;

  const chamado = await prisma.chamados_escalas.update({
    where: { id },
    data: updateData
  });

  return res.status(200).json({
    success: true,
    data: chamado
  });
}
