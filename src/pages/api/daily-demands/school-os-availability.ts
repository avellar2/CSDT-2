import { NextApiRequest, NextApiResponse } from "next";
import { getSchoolPendingDailyDemandAvailability } from "@/utils/schoolPendingDailyDemandAvailability";
import { requireAuth } from "@/utils/api-auth";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Método não permitido" });
  // Requer autenticação
  const auth = await requireAuth(req, res);
  if (!auth) return;

  }

  const userId = typeof req.query.userId === "string" ? req.query.userId : "";
  const schoolName = typeof req.query.schoolName === "string" ? req.query.schoolName : "";

  if (!userId || !schoolName) {
    return res.status(400).json({ error: "userId e schoolName são obrigatórios." });
  }

  try {
    const result = await getSchoolPendingDailyDemandAvailability({
      userId,
      schoolName,
    });

    return res.status(200).json(result);
  } catch (error) {
    console.error("Erro ao validar disponibilidade da OS por escola:", error);
    return res.status(500).json({
      error: "Erro interno do servidor",
      details: error instanceof Error ? error.message : "Erro desconhecido",
    });
  }
}
