import type { NextApiRequest, NextApiResponse } from "next";
import { requireFeedbackAdmin } from "@/utils/feedback/adminAuth";
import { markFeedbackResponsesViewed } from "@/utils/feedback/adminQueries";

/**
 * Marca a lista de respostas como visualizada pelo operador ADMTOTAL.
 * Alimenta o indicador de "respostas novas" do card do Dashboard.
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  const actor = await requireFeedbackAdmin(req, res);
  if (!actor) return;

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    const lastSeenAt = await markFeedbackResponsesViewed(actor.userId);
    return res.status(200).json({ lastSeenAt: lastSeenAt.toISOString() });
  } catch (error) {
    console.error("Erro ao marcar respostas como vistas:", error);
    return res.status(500).json({ error: "Erro ao atualizar visualização." });
  }
}
