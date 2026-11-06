import { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/utils/prisma";
import { getBrazilDayRange } from "@/utils/dailyDemandOsRules";
import { requireAuth } from "@/utils/api-auth";
import { isValidDateKey } from "@/utils/operationalRoutes";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const auth = await requireAuth(req, res);
  if (!auth) return;

  if (req.method === "GET") {
    const { date } = req.query;

    if (!isValidDateKey(date)) {
      return res.status(400).json({ error: "date é obrigatório (YYYY-MM-DD)." });
    }

    try {
      const { start, end } = getBrazilDayRange(date);
      const releases = await prisma.dailyDemandOsRelease.findMany({
        where: {
          demandDate: {
            gte: start,
            lte: end,
          },
          active: true,
        },
        select: {
          technicianId: true,
        },
      });

      return res.status(200).json({
        releasedTechnicianIds: releases.map((release) => release.technicianId),
      });
    } catch (error) {
      console.error("Erro ao listar liberações de OS:", error);
      return res.status(500).json({ error: "Erro interno do servidor" });
    }
  }

  if (req.method === "POST" || req.method === "DELETE") {
    const { technicianId, date } = req.body || {};

    if (!technicianId || !date) {
      return res.status(400).json({ error: "technicianId e date são obrigatórios." });
    }

    if (!isValidDateKey(date)) {
      return res.status(400).json({ error: "date deve estar no formato YYYY-MM-DD." });
    }

    try {
      // A identidade do administrador vem da sessão autenticada, nunca do corpo.
      const adminProfile = await prisma.profile.findUnique({
        where: { userId: auth.id },
        select: {
          id: true,
          role: true,
        },
      });

      if (!adminProfile || adminProfile.role !== "ADMTOTAL") {
        return res.status(403).json({
          error:
            req.method === "POST"
              ? "Somente ADMTOTAL pode liberar OS após o expediente."
              : "Somente ADMTOTAL pode remover a liberação.",
        });
      }

      const { start, end } = getBrazilDayRange(date);

      if (req.method === "POST") {
        const visitTechnician = await prisma.visitTechnician.findFirst({
          where: {
            technicianId: Number(technicianId),
            createdAt: {
              gte: start,
              lte: end,
            },
          },
          select: { id: true },
        });

        if (!visitTechnician) {
          return res.status(400).json({
            error: "Só é possível liberar técnicos que estavam em visita técnica nesta data.",
          });
        }
      }

      const release = await prisma.dailyDemandOsRelease.upsert({
        where: {
          technicianId_demandDate: {
            technicianId: Number(technicianId),
            demandDate: start,
          },
        },
        update: {
          active: req.method === "POST",
          releasedById: adminProfile.id,
          updatedAt: new Date(),
        },
        create: {
          technicianId: Number(technicianId),
          demandDate: start,
          releasedById: adminProfile.id,
          active: req.method === "POST",
          updatedAt: new Date(),
        },
      });

      return res.status(200).json({ success: true, release });
    } catch (error) {
      console.error("Erro ao atualizar liberação de OS:", error);
      return res.status(500).json({ error: "Erro interno do servidor" });
    }
  }

  res.setHeader("Allow", ["GET", "POST", "DELETE"]);
  return res.status(405).json({ error: "Método não permitido" });
}
