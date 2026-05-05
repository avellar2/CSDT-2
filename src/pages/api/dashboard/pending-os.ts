import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/utils/prisma';
import { getPendingDailyDemandItems } from '@/utils/pendingDailyDemandOs';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { userId } = req.query;
    let tecnicoResponsavelFilter: string | undefined;

    if (userId && typeof userId === 'string') {
      const profile = await prisma.profile.findUnique({
        where: { userId },
        select: { role: true, displayName: true },
      });

      if (profile?.role === 'TECH') {
        tecnicoResponsavelFilter = profile.displayName;
      }
    }

    const sharedWhere = tecnicoResponsavelFilter
      ? { tecnicoResponsavel: tecnicoResponsavelFilter }
      : {};

    const pendingOsOld = await prisma.os.count({
      where: sharedWhere,
    });

    const pendingOsNew = await prisma.oSExterna.count({
      where: {
        status: 'Pendente',
        ...sharedWhere,
      },
    });

    const pendingDailyDemands = await getPendingDailyDemandItems({
      userId: userId && typeof userId === 'string' ? userId : undefined,
    });

    const totalPendingOS = pendingOsOld + pendingOsNew + pendingDailyDemands.length;

    return res.status(200).json({
      success: true,
      data: {
        pendingOsOld,
        pendingOsNew,
        pendingDailyDemands: pendingDailyDemands.length,
        totalPendingOS,
        scope: tecnicoResponsavelFilter ? 'mine' : 'all',
      },
    });
  } catch (error) {
    console.error('Erro ao contar OS pendentes:', error);
    return res.status(500).json({
      error: 'Erro interno do servidor',
      details: error instanceof Error ? error.message : 'Erro desconhecido',
    });
  }
}
