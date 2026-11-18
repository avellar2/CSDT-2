import type { NextApiRequest, NextApiResponse } from "next";
import { requireFeedbackAdmin } from "@/utils/feedback/adminAuth";
import { getResponseDetail } from "@/utils/feedback/adminQueries";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  const actor = await requireFeedbackAdmin(req, res);
  if (!actor) return;

  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const responseId = Number(req.query.id);
  if (!Number.isInteger(responseId) || responseId <= 0) {
    return res.status(400).json({ error: "Resposta inválida." });
  }

  try {
    const detail = await getResponseDetail(responseId);
    if (!detail) return res.status(404).json({ error: "Resposta não encontrada." });
    return res.status(200).json(detail);
  } catch (error) {
    console.error("Erro ao carregar resposta:", error);
    return res.status(500).json({ error: "Erro ao carregar resposta." });
  }
}
