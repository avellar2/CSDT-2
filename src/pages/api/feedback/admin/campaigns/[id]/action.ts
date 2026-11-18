import type { NextApiRequest, NextApiResponse } from "next";
import { requireFeedbackAdmin } from "@/utils/feedback/adminAuth";
import {
  FeedbackServiceError,
  setCampaignStatus,
} from "@/utils/feedback/service";

const ACTIONS = new Set(["PAUSE", "RESUME", "CLOSE"]);

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

  const action = String(req.body?.action ?? "");
  if (!ACTIONS.has(action)) {
    return res.status(400).json({ error: "Ação inválida." });
  }

  try {
    await setCampaignStatus(
      campaignId,
      action as "PAUSE" | "RESUME" | "CLOSE",
      actor,
    );
    return res.status(200).json({ success: true });
  } catch (error) {
    if (error instanceof FeedbackServiceError) {
      return res.status(error.status).json({ error: error.message });
    }
    console.error("Erro ao alterar status da campanha:", error);
    return res.status(500).json({ error: "Erro ao alterar campanha." });
  }
}
