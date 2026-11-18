import type { NextApiRequest, NextApiResponse } from "next";
import { requireFeedbackAdmin } from "@/utils/feedback/adminAuth";
import { FeedbackServiceError, prepareCampaign } from "@/utils/feedback/service";

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

  const campaignId = Number(req.query.id);
  if (!Number.isInteger(campaignId) || campaignId <= 0) {
    return res.status(400).json({ error: "Campanha inválida." });
  }

  try {
    const result = await prepareCampaign(campaignId, actor);
    return res.status(200).json({
      ...result,
      message:
        "Convites preparados. Nenhuma mensagem foi enviada; o envio depende de autorização explícita.",
    });
  } catch (error) {
    if (error instanceof FeedbackServiceError) {
      return res.status(error.status).json({ error: error.message });
    }
    console.error("Erro ao preparar campanha:", error);
    return res.status(500).json({ error: "Erro ao preparar campanha." });
  }
}
