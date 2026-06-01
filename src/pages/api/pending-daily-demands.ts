import { NextApiRequest, NextApiResponse } from "next";
import { getPendingDailyDemandItems } from "@/utils/pendingDailyDemandOs";
import { requireAuth } from "@/utils/api-auth";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Método não permitido" });
  // Requer autenticação
  const auth = await requireAuth(req, res);
  if (!auth) return;

  }

  try {
    const { userId } = req.query;

    const items = await getPendingDailyDemandItems({
      userId: typeof userId === "string" ? userId : undefined,
    });

    return res.status(200).json({
      success: true,
      data: items,
      total: items.length,
    });
  } catch (error) {
    console.error("Erro ao buscar demandas pendentes sem OS:", error);
    return res.status(500).json({
      error: "Erro interno do servidor",
      details: error instanceof Error ? error.message : "Erro desconhecido",
    });
  }
}
