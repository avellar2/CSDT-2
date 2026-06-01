import { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/utils/prisma";
import { getBrazilDayRange } from "@/utils/dailyDemandOsRules";
import { requireAuth } from "@/utils/api-auth";

async function getAdminProfile(userId: string) {
  return prisma.profile.findUnique({
    where: { userId },
    select: {
      id: true,
      role: true,
    },
  });
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "GET") {
    const { date } = req.query;

    if (!date || typeof date !== "string") {
      return res.status(400).json({ error: "date é obrigatório." });
    }

  // Requer autenticação
  const auth = await requireAuth(req, res);
  if (!auth) return;

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

  if (req.method === "POST") {
    const { userId, technicianId, date } = req.body;

    if (!userId || !technicianId || !date) {
      return res.status(400).json({ error: "userId, technicianId e date são obrigatórios." });
    }

    try {
      const adminProfile = await getAdminProfile(userId);

      if (!adminProfile || adminProfile.role !== "ADMTOTAL") {
        return res.status(403).json({ error: "Somente ADMTOTAL pode liberar OS após o expediente." });
      }

      const { start, end } = getBrazilDayRange(date);
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
        return res.status(400).json({ error: "Só é possível liberar técnicos que estavam em visita técnica nesta data." });
      }

      const release = await prisma.dailyDemandOsRelease.upsert({
        where: {
          technicianId_demandDate: {
            technicianId: Number(technicianId),
            demandDate: start,
          },
        },
        update: {
          active: true,
          releasedById: adminProfile.id,
          updatedAt: new Date(),
        },
        create: {
          technicianId: Number(technicianId),
          demandDate: start,
          releasedById: adminProfile.id,
          active: true,
          updatedAt: new Date(),
        },
      });

      return res.status(200).json({ success: true, release });
    } catch (error) {
      console.error("Erro ao liberar OS após expediente:", error);
      return res.status(500).json({ error: "Erro interno do servidor" });
    }
  }

  if (req.method === "DELETE") {
    const { userId, technicianId, date } = req.body;

    if (!userId || !technicianId || !date) {
      return res.status(400).json({ error: "userId, technicianId e date são obrigatórios." });
    }

    try {
      const adminProfile = await getAdminProfile(userId);

      if (!adminProfile || adminProfile.role !== "ADMTOTAL") {
        return res.status(403).json({ error: "Somente ADMTOTAL pode remover a liberação." });
      }

      const { start } = getBrazilDayRange(date);
      await prisma.dailyDemandOsRelease.upsert({
        where: {
          technicianId_demandDate: {
            technicianId: Number(technicianId),
            demandDate: start,
          },
        },
        update: {
          active: false,
          releasedById: adminProfile.id,
          updatedAt: new Date(),
        },
        create: {
          technicianId: Number(technicianId),
          demandDate: start,
          releasedById: adminProfile.id,
          active: false,
          updatedAt: new Date(),
        },
      });

      return res.status(200).json({ success: true });
    } catch (error) {
      console.error("Erro ao remover liberação de OS:", error);
      return res.status(500).json({ error: "Erro interno do servidor" });
    }
  }

  return res.status(405).json({ error: "Método não permitido" });
}
