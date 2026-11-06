import { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/utils/prisma";
import { requireAuth } from "@/utils/api-auth";
import { getBrazilDayRange } from "@/utils/dailyDemandOsRules";
import {
  canProfileAccessDemand,
  demandDateKey,
  isRouteManager,
} from "@/utils/operationalRoutes";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const auth = await requireAuth(req, res);
  if (!auth) return;

  if (req.method !== "PATCH") {
    res.setHeader("Allow", ["PATCH"]);
    return res.status(405).json({ error: "Método não permitido" });
  }

  const { demandId, action, reason } = req.body || {};

  if (!demandId || !action) {
    return res.status(400).json({ error: "demandId e action são obrigatórios." });
  }

  if (action !== "NOT_VISITED" && action !== "RESET") {
    return res.status(400).json({ error: "action inválido." });
  }

  if (action === "NOT_VISITED" && (!reason || !String(reason).trim())) {
    return res.status(400).json({ error: "Motivo é obrigatório para marcar como não visitada." });
  }

  try {
    // O usuário vem SEMPRE da autenticação validada; o userId do corpo é
    // ignorado para não permitir falsificação de identidade.
    const profile = await prisma.profile.findUnique({
      where: { userId: auth.id },
      select: {
        id: true,
        role: true,
        displayName: true,
      },
    });

    if (!profile) {
      return res.status(404).json({ error: "Perfil não encontrado." });
    }

    const demand = await prisma.schoolDemand.findUnique({
      where: { id: Number(demandId) },
      select: {
        id: true,
        createdAt: true,
        routeId: true,
      },
    });

    if (!demand) {
      return res.status(404).json({ error: "Demanda não encontrada." });
    }

    const canAccess = await canProfileAccessDemand({
      profileId: profile.id,
      role: profile.role,
      demandId: demand.id,
      demandCreatedAt: demand.createdAt,
      demandRouteId: demand.routeId,
    });

    if (!canAccess) {
      return res.status(403).json({
        error: "Você não tem acesso a esta demanda.",
      });
    }

    if (!isRouteManager(profile.role) && profile.role === "TECH") {
      // Compatibilidade com o fluxo antigo: também exige que o técnico
      // esteja em visita na data da demanda.
      const dateKey = demandDateKey(demand.createdAt);
      const { start, end } = getBrazilDayRange(dateKey);

      const visitAllocation = await prisma.visitTechnician.findFirst({
        where: {
          technicianId: profile.id,
          createdAt: {
            gte: start,
            lte: end,
          },
        },
        select: { id: true },
      });

      if (!visitAllocation) {
        return res.status(403).json({
          error: "Somente técnicos responsáveis pela visita podem alterar esse status.",
        });
      }
    }

    const updated = await prisma.schoolDemand.update({
      where: { id: demand.id },
      data:
        action === "RESET"
          ? {
              visitStatus: null,
              visitReason: null,
              visitUpdatedBy: profile.displayName,
              visitUpdatedAt: new Date(),
            }
          : {
              visitStatus: "NOT_VISITED",
              visitReason: String(reason).trim(),
              visitUpdatedBy: profile.displayName,
              visitUpdatedAt: new Date(),
            },
    });

    return res.status(200).json({
      success: true,
      data: updated,
    });
  } catch (error) {
    console.error("Erro ao atualizar status de visita da demanda:", error);
    return res.status(500).json({
      error: "Erro interno do servidor",
      details: error instanceof Error ? error.message : "Erro desconhecido",
    });
  }
}
