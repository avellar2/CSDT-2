import type { NextApiRequest, NextApiResponse } from "next";
import { requireFeedbackAdmin } from "@/utils/feedback/adminAuth";
import { createCampaign } from "@/utils/feedback/service";
import { listCampaignSummaries } from "@/utils/feedback/adminQueries";
import { FeedbackServiceError } from "@/utils/feedback/service";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  const actor = await requireFeedbackAdmin(req, res);
  if (!actor) return;

  if (req.method === "GET") {
    try {
      const campaigns = await listCampaignSummaries();
      return res.status(200).json({ campaigns });
    } catch (error) {
      console.error("Erro ao listar campanhas:", error);
      return res.status(500).json({ error: "Erro ao listar campanhas." });
    }
  }

  if (req.method === "POST") {
    try {
      const body = req.body ?? {};
      const deadline =
        typeof body.deadline === "string" && body.deadline.trim()
          ? new Date(body.deadline)
          : null;

      if (deadline && Number.isNaN(deadline.getTime())) {
        return res.status(400).json({ error: "Prazo inválido." });
      }

      const campaign = await createCampaign({
        name: body.name,
        subject: body.subject,
        introText: body.introText,
        deadline,
        actor,
      });

      return res.status(201).json({ campaign });
    } catch (error) {
      if (error instanceof FeedbackServiceError) {
        return res.status(error.status).json({ error: error.message });
      }
      console.error("Erro ao criar campanha:", error);
      return res.status(500).json({ error: "Erro ao criar campanha." });
    }
  }

  res.setHeader("Allow", "GET, POST");
  return res.status(405).json({ error: "Method Not Allowed" });
}
