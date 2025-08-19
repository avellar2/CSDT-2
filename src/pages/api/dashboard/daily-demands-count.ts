import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/utils/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Configuração do filtro de data para hoje (fuso horário brasileiro UTC-3)
    const now = new Date();
    const brazilTime = new Date(now.getTime() - (3 * 60 * 60 * 1000));
    const today = new Date(brazilTime.toISOString().split('T')[0] + 'T00:00:00-03:00');
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0, 0);
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);

    // Contar demandas criadas hoje
    const dailyDemandsCount = await prisma.schoolDemand.count({
      where: {
        createdAt: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
    });

    // Contar demandas total (para comparação)
    const totalDemandsCount = await prisma.schoolDemand.count();

    console.log('📊 Contagem de demandas:', {
      dailyDemandsCount,
      totalDemandsCount,
      date: now.toLocaleDateString('pt-BR')
    });

    return res.status(200).json({
      success: true,
      data: {
        dailyDemandsCount,
        totalDemandsCount,
        date: now.toLocaleDateString('pt-BR')
      }
    });

  } catch (error) {
    console.error('❌ Erro ao contar demandas diárias:', error);
    return res.status(500).json({
      error: 'Erro interno do servidor',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}