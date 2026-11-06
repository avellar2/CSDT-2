import { NextApiRequest, NextApiResponse } from "next";
import { getSchoolPendingDailyDemandAvailability } from "@/utils/schoolPendingDailyDemandAvailability";
import { requireAuth } from "@/utils/api-auth";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const auth = await requireAuth(req, res);
  if (!auth) return;

  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).json({ error: "Método não permitido" });
  }

  const schoolName =
    typeof req.query.schoolName === "string" ? req.query.schoolName : "";

  if (!schoolName) {
    return res.status(400).json({ error: "schoolName é obrigatório." });
  }

  try {
    const result = await getSchoolPendingDailyDemandAvailability({
      // Identidade autenticada; userId da query não é confiável.
      userId: auth.id,
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
