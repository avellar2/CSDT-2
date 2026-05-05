import { NextApiRequest, NextApiResponse } from "next";
import { assessDailyDemandOsAvailability } from "@/utils/dailyDemandOsRules";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Método não permitido" });
  }

  const { userId, date } = req.query;

  if (!userId || typeof userId !== "string" || !date || typeof date !== "string") {
    return res.status(400).json({ error: "userId e date são obrigatórios." });
  }

  try {
    const result = await assessDailyDemandOsAvailability({
      userId,
      demandDate: date,
    });

    return res.status(200).json(result);
  } catch (error) {
    console.error("Erro ao verificar disponibilidade da OS diária:", error);
    return res.status(500).json({ error: "Erro interno do servidor" });
  }
}
