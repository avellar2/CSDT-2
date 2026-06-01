import { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/utils/prisma";
import { getNotVisitedDailyDemandItems } from "@/utils/notVisitedDailyDemands";
import { requireAuth } from "@/utils/api-auth";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Metodo nao permitido" });
  // Requer autenticação
  const auth = await requireAuth(req, res);
  if (!auth) return;

  }

  const userId = typeof req.query.userId === "string" ? req.query.userId : "";
  const date = typeof req.query.date === "string" ? req.query.date : "";

  if (!userId || !date) {
    return res.status(400).json({ error: "userId e date sao obrigatorios." });
  }

  try {
    const profile = await prisma.profile.findUnique({
      where: { userId },
      select: {
        role: true,
      },
    });

    if (!profile || !["ADMIN", "ADMTOTAL"].includes(profile.role)) {
      return res.status(403).json({ error: "Acesso negado." });
    }

    const items = await getNotVisitedDailyDemandItems({ date });

    return res.status(200).json({
      success: true,
      data: items,
      total: items.length,
    });
  } catch (error) {
    console.error("Erro ao buscar demandas nao visitadas:", error);
    return res.status(500).json({
      error: "Erro interno do servidor",
      details: error instanceof Error ? error.message : "Erro desconhecido",
    });
  }
}
