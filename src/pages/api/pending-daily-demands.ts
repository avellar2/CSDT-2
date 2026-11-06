import { NextApiRequest, NextApiResponse } from "next";
import { getPendingDailyDemandItems } from "@/utils/pendingDailyDemandOs";
import { requireAuth } from "@/utils/api-auth";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const auth = await requireAuth(req, res);
  if (!auth) return;

  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).json({ error: "Método não permitido" });
  }

  try {
    // O escopo vem do usuário autenticado; `userId` na query é ignorado.
    const items = await getPendingDailyDemandItems({
      profile: auth.profile,
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
