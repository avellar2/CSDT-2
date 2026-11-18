import type { NextApiRequest, NextApiResponse } from "next";
import { requireFeedbackAdmin } from "@/utils/feedback/adminAuth";
import {
  computeParticipation,
  computeStats,
  listCampaignSummaries,
} from "@/utils/feedback/adminQueries";

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

  try {
    const campaignId = Number(req.query.campaignId);
    const filters = {
      campaignId: Number.isInteger(campaignId) && campaignId > 0 ? campaignId : undefined,
      district: typeof req.query.district === "string" ? req.query.district : undefined,
      includeTest: req.query.includeTest === "1",
    };

    const [stats, participation, campaigns] = await Promise.all([
      computeStats(filters),
      computeParticipation({ campaignId: filters.campaignId, includeTest: filters.includeTest }),
      listCampaignSummaries(),
    ]);

    return res.status(200).json({
      ...stats,
      participation,
      campaigns: campaigns
        .filter((campaign) => (filters.includeTest ? true : campaign.channel === "OFFICIAL"))
        .map((campaign) => ({
          id: campaign.id,
          name: campaign.name,
          status: campaign.status,
          channel: campaign.channel,
          responses: campaign.responses,
          totalInvites: campaign.totalInvites,
          invitesSent: campaign.invitesSent,
          invitesFailed: campaign.invitesFailed,
          createdAt: campaign.createdAt,
        })),
    });
  } catch (error) {
    console.error("Erro ao calcular estatísticas:", error);
    return res.status(500).json({ error: "Erro ao calcular estatísticas." });
  }
}
