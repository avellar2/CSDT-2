import { NextApiRequest, NextApiResponse } from "next";
import { assessDailyDemandOsAvailability } from "@/utils/dailyDemandOsRules";
import { requireAuth } from "@/utils/api-auth";
import { isValidDateKey } from "@/utils/operationalRoutes";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const auth = await requireAuth(req, res);
  if (!auth) return;

  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).json({ error: "Método não permitido" });
  }

  const date = req.query.date;
  const demandId =
    typeof req.query.demandId === "string" && req.query.demandId
      ? Number(req.query.demandId)
      : null;

  if (!isValidDateKey(date)) {
    return res.status(400).json({ error: "date é obrigatório (YYYY-MM-DD)." });
  }

  try {
    // A identidade vem da sessão; o userId da query é ignorado.
    const result = await assessDailyDemandOsAvailability({
      userId: auth.id,
      demandDate: date,
      demandId: demandId && Number.isInteger(demandId) ? demandId : null,
    });

    return res.status(200).json(result);
  } catch (error) {
    console.error("Erro ao verificar disponibilidade da OS diária:", error);
    return res.status(500).json({ error: "Erro interno do servidor" });
  }
}
