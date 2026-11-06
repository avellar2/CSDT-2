import { NextApiRequest, NextApiResponse } from "next";
import { getNotVisitedDailyDemandItems } from "@/utils/notVisitedDailyDemands";
import { requireAuth } from "@/utils/api-auth";
import { isRouteManager, isValidDateKey } from "@/utils/operationalRoutes";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const auth = await requireAuth(req, res);
  if (!auth) return;

  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).json({ error: "Metodo nao permitido" });
  }

  // O perfil vem do token; `userId` na query não é usado para autorizar.
  if (!isRouteManager(auth.profile.role)) {
    return res.status(403).json({ error: "Acesso negado." });
  }

  const date = typeof req.query.date === "string" ? req.query.date : "";

  if (!isValidDateKey(date)) {
    return res.status(400).json({ error: "date deve estar no formato YYYY-MM-DD." });
  }

  try {
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
