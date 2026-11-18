import type { NextApiRequest, NextApiResponse } from "next";
import { requireFeedbackAdmin, requestBaseUrl } from "@/utils/feedback/adminAuth";
import { FeedbackServiceError, reopenInvite } from "@/utils/feedback/service";

/**
 * Reabertura administrativa explícita de um convite já respondido.
 * Gera um novo token (o anterior deixa de funcionar) e remove a resposta
 * anterior, preservando a auditoria da ação.
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

  const inviteId = Number(req.query.id);
  if (!Number.isInteger(inviteId) || inviteId <= 0) {
    return res.status(400).json({ error: "Convite inválido." });
  }

  try {
    const result = await reopenInvite(inviteId, actor, requestBaseUrl(req));
    return res.status(200).json(result);
  } catch (error) {
    if (error instanceof FeedbackServiceError) {
      return res.status(error.status).json({ error: error.message });
    }
    console.error("Erro ao reabrir convite:", error);
    return res.status(500).json({ error: "Erro ao reabrir convite." });
  }
}
