import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/utils/prisma';
import { getPendingDailyDemandItems } from '@/utils/pendingDailyDemandOs';
import { requireAuth } from "@/utils/api-auth";
import {
  buildOperationalOsWhere,
  loadOsScope,
} from '@/utils/operationalOsScope';

/**
 * Indicadores de OS pendentes do dashboard.
 *
 * O escopo é decidido no backend a partir do usuário autenticado: técnicos
 * contam apenas as OS operacionais das próprias rotas; ADMIN/ADMTOTAL contam
 * tudo. `userId` na query é ignorado.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const auth = await requireAuth(req, res);
  if (!auth) return;

  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const scope = await loadOsScope(auth);

    const pendingOsNew = await prisma.oSExterna.count({
      where: {
        status: 'Pendente',
        ...buildOperationalOsWhere(scope),
      },
    });

    const pendingDailyDemands = await getPendingDailyDemandItems({
      profile: auth.profile,
    });

    const visiblePendingDailyDemands = pendingDailyDemands.filter(
      (item) => item.visitStatus !== 'NOT_VISITED'
    );

    const totalPendingOS = pendingOsNew + visiblePendingDailyDemands.length;

    return res.status(200).json({
      success: true,
      data: {
        pendingOsNew,
        pendingDailyDemands: visiblePendingDailyDemands.length,
        totalPendingOS,
        scope: scope.isTechnician ? 'mine' : 'all',
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
