import type { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';
import { requireAuth } from "@/utils/api-auth";
import { AuthUser } from "@/utils/api-auth";
import { formatBrazilDateKey } from "@/utils/dailyDemandOsRules";
import {
  canTechnicianSeeRouteEntity,
  dateKeyFromPrismaDate,
  isRouteManager,
  loadRouteScope,
  routeStatusIsOpen,
} from "@/utils/operationalRoutes";

const prisma = new PrismaClient();

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const auth = await requireAuth(req, res);
  if (!auth) return;

  const { id } = req.query;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'ID inválido' });
  }

  try {
    switch (req.method) {
      case 'PATCH':
        return await handlePatch(req, res, parseInt(id), auth);
      default:
        res.setHeader('Allow', ['PATCH']);
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
  id: number,
  auth: AuthUser
) {
  const { status, dataAgendamento, observacoes, routeId } = req.body || {};

  const existing = await prisma.chamados_escalas.findUnique({ where: { id } });

  if (!existing) {
    return res.status(404).json({ error: 'Chamado não encontrado' });
  }

  if (
    dataAgendamento !== undefined &&
    dataAgendamento !== null &&
    Number.isNaN(new Date(dataAgendamento).getTime())
  ) {
    return res.status(400).json({ error: 'dataAgendamento inválida.' });
  }

  if (!isRouteManager(auth.profile.role) && auth.profile.role === 'TECH') {
    const existingDateKey = formatBrazilDateKey(
      existing.dataAgendamento || existing.dataCriacao
    );
    const scope = await loadRouteScope([existingDateKey]);

    if (
      !canTechnicianSeeRouteEntity({
        scope,
        dateKey: existingDateKey,
        routeId: existing.routeId,
        profileId: auth.profile.id,
      })
    ) {
      return res.status(403).json({ error: 'Este chamado pertence a outra rota.' });
    }

    // Reagendar um chamado com rota para outro dia equivale a transferi-lo:
    // somente a administração pode fazer isso.
    if (
      existing.routeId !== null &&
      dataAgendamento &&
      formatBrazilDateKey(new Date(dataAgendamento)) !== existingDateKey
    ) {
      return res.status(403).json({
        error:
          'Somente ADMIN ou ADMTOTAL podem reagendar um chamado com rota para outra data.',
      });
    }
  }

  const updateData: Record<string, unknown> = {};

  if (status) updateData.status = status;
  if (dataAgendamento) updateData.dataAgendamento = new Date(dataAgendamento);
  if (observacoes !== undefined) updateData.observacoes = observacoes;

  // Troca de rota responsável: apenas a administração pode fazer essa alteração.
  let targetRouteId: number | null | undefined;
  if (routeId !== undefined) {
    if (!isRouteManager(auth.profile.role)) {
      return res
        .status(403)
        .json({ error: 'Apenas a administração pode alterar a rota do chamado.' });
    }

    if (routeId === null || routeId === '') {
      targetRouteId = null;
    } else {
      const numericRouteId = Number(routeId);
      if (!Number.isInteger(numericRouteId) || numericRouteId <= 0) {
        return res.status(400).json({ error: 'Rota inválida.' });
      }

      const route = await prisma.dailyRoute.findUnique({
        where: { id: numericRouteId },
        select: { id: true, date: true, status: true },
      });

      if (!route) {
        return res.status(404).json({ error: 'Rota não encontrada.' });
      }

      if (!routeStatusIsOpen(route.status)) {
        return res.status(400).json({ error: 'A rota está encerrada.' });
      }

      const targetDateKey = dataAgendamento
        ? formatBrazilDateKey(new Date(dataAgendamento))
        : formatBrazilDateKey(existing.dataAgendamento || existing.dataCriacao);

      if (dateKeyFromPrismaDate(route.date) !== targetDateKey) {
        return res
          .status(400)
          .json({ error: 'A rota selecionada pertence a outra data.' });
      }

      targetRouteId = numericRouteId;
    }

    updateData.routeId = targetRouteId;
  }

  const result = await prisma.$transaction(async (tx) => {
    const chamado = await tx.chamados_escalas.update({
      where: { id },
      data: updateData
    });

    if (targetRouteId !== undefined && targetRouteId !== existing.routeId) {
      await tx.routeTransfer.create({
        data: {
          entityType: 'CHAMADO',
          entityId: id,
          fromRouteId: existing.routeId,
          toRouteId: targetRouteId,
          movedBy: auth.id,
          note: 'Transferência de rota na tela de escalas',
        },
      });

      return chamado;
    }

    // Reagendamento: se a nova data não é mais a data da rota, o chamado sai
    // da rota (fila administrativa) e a movimentação fica auditada.
    if (chamado.routeId !== null && dataAgendamento) {
      const newDateKey = formatBrazilDateKey(
        chamado.dataAgendamento || chamado.dataCriacao
      );

      const route = await tx.dailyRoute.findUnique({
        where: { id: chamado.routeId },
        select: { date: true },
      });

      if (!route || dateKeyFromPrismaDate(route.date) !== newDateKey) {
        const updated = await tx.chamados_escalas.update({
          where: { id },
          data: { routeId: null },
        });

        await tx.routeTransfer.create({
          data: {
            entityType: 'CHAMADO',
            entityId: id,
            fromRouteId: chamado.routeId,
            toRouteId: null,
            movedBy: auth.id,
            note: 'Reagendamento para data diferente da rota',
          },
        });

        return updated;
      }
    }

    return chamado;
  });

  return res.status(200).json({
    success: true,
    data: result
  });
}
