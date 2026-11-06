import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/utils/prisma';
import { requireAuth } from "@/utils/api-auth";
import { formatBrazilDateKey, getBrazilDayRange } from '@/utils/dailyDemandOsRules';
import {
  buildOperationalDemandWhere,
  loadOsScope,
} from '@/utils/operationalOsScope';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const auth = await requireAuth(req, res);
  if (!auth) return;

  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Contadores seguem o mesmo escopo operacional das listagens: técnico
    // conta apenas demandas da própria rota; gestores contam tudo.
    const scope = await loadOsScope(auth);
    const demandWhere = buildOperationalDemandWhere(scope);

    const todayKey = formatBrazilDateKey(new Date());
    const { start, end } = getBrazilDayRange(todayKey);

    const dailyDemandsCount = await prisma.schoolDemand.count({
      where: {
        createdAt: {
          gte: start,
          lte: end,
        },
        ...demandWhere,
      },
    });

    const totalDemandsCount = await prisma.schoolDemand.count({
      where: demandWhere,
    });

    return res.status(200).json({
      success: true,
      data: {
        dailyDemandsCount,
        totalDemandsCount,
        date: new Date(`${todayKey}T12:00:00-03:00`).toLocaleDateString('pt-BR'),
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
