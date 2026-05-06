import { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/utils/prisma";

function getDemandDateKey(date: Date) {
  return date.toLocaleDateString("en-CA", {
    timeZone: "America/Sao_Paulo",
  });
}

function getBrazilDayRange(dateKey: string) {
  const start = new Date(`${dateKey}T00:00:00-03:00`);
  const end = new Date(`${dateKey}T23:59:59.999-03:00`);
  return { start, end };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "PATCH") {
    return res.status(405).json({ error: "Método não permitido" });
  }

  const { demandId, userId, action, reason } = req.body;

  if (!demandId || !userId || !action) {
    return res.status(400).json({ error: "demandId, userId e action são obrigatórios." });
  }

  if (action === "NOT_VISITED" && (!reason || !String(reason).trim())) {
    return res.status(400).json({ error: "Motivo é obrigatório para marcar como não visitada." });
  }

  try {
    const [profile, demand] = await Promise.all([
      prisma.profile.findUnique({
        where: { userId: String(userId) },
        select: {
          id: true,
          role: true,
          displayName: true,
        },
      }),
      prisma.schoolDemand.findUnique({
        where: { id: Number(demandId) },
        select: {
          id: true,
          createdAt: true,
        },
      }),
    ]);

    if (!profile) {
      return res.status(404).json({ error: "Perfil não encontrado." });
    }

    if (!demand) {
      return res.status(404).json({ error: "Demanda não encontrada." });
    }

    const demandDateKey = getDemandDateKey(demand.createdAt);
    const { start, end } = getBrazilDayRange(demandDateKey);

    if (profile.role === "TECH") {
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
      where: { id: Number(demandId) },
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
