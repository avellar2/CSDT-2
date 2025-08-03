import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/utils/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Contar OS da tabela antiga (todas são pendentes)
    const pendingOsOld = await prisma.os.count();

    // Contar OS da tabela nova com status "Pendente"
    const pendingOsNew = await prisma.oSExterna.count({
      where: {
        status: 'Pendente'
      }
    });

    // Total de OS pendentes
    const totalPendingOS = pendingOsOld + pendingOsNew;

    console.log('📊 Contagem de OS pendentes:', {
      pendingOsOld,
      pendingOsNew,
      totalPendingOS
    });

    return res.status(200).json({
      success: true,
      data: {
        pendingOsOld,
        pendingOsNew,
        totalPendingOS
      }
    });

  } catch (error) {
    console.error('❌ Erro ao contar OS pendentes:', error);
    return res.status(500).json({
      error: 'Erro interno do servidor',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}