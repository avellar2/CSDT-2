import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/utils/prisma";
import { requireFeedbackAdmin } from "@/utils/feedback/adminAuth";
import { getCampaignDetail, listInvites } from "@/utils/feedback/adminQueries";
import { feedbackQueueWorkerEnabled } from "@/utils/feedback/config";
import { FeedbackServiceError, logFeedbackAudit } from "@/utils/feedback/service";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  const actor = await requireFeedbackAdmin(req, res);
  if (!actor) return;

  const campaignId = Number(req.query.id);
  if (!Number.isInteger(campaignId) || campaignId <= 0) {
    return res.status(400).json({ error: "Campanha inválida." });
  }

  if (req.method === "GET") {
    try {
      const detail = await getCampaignDetail(campaignId);
      if (!detail) return res.status(404).json({ error: "Campanha não encontrada." });

      const invites =
        req.query.invites === "1"
          ? await listInvites({
              campaignId,
              status: typeof req.query.status === "string" ? req.query.status : undefined,
              schoolQuery:
                typeof req.query.q === "string" ? req.query.q : undefined,
              page: Number(req.query.page) || 1,
              pageSize: Number(req.query.pageSize) || 25,
            })
          : undefined;

      return res.status(200).json({
        ...detail,
        invites,
        workerEnabled: feedbackQueueWorkerEnabled(),
      });
    } catch (error) {
      console.error("Erro ao carregar campanha:", error);
      return res.status(500).json({ error: "Erro ao carregar campanha." });
    }
  }

  if (req.method === "PATCH") {
    try {
      const campaign = await prisma.feedbackCampaign.findUnique({
        where: { id: campaignId },
        select: { status: true },
      });
      if (!campaign) return res.status(404).json({ error: "Campanha não encontrada." });
      if (!["DRAFT", "READY"].includes(campaign.status)) {
        return res.status(409).json({
          error: "Só é possível editar campanhas ainda não enviadas.",
        });
      }

      const body = req.body ?? {};
      const data: {
        name?: string;
        subject?: string;
        introText?: string;
        deadline?: Date | null;
      } = {};

      if (typeof body.name === "string") {
        const name = body.name.trim();
        if (!name) return res.status(400).json({ error: "Nome obrigatório." });
        data.name = name.slice(0, 160);
      }
      if (typeof body.subject === "string") {
        data.subject = body.subject.trim().slice(0, 300);
      }
      if (typeof body.introText === "string") {
        data.introText = body.introText.trim().slice(0, 2000);
      }
      if (body.deadline === null) {
        data.deadline = null;
      } else if (typeof body.deadline === "string" && body.deadline.trim()) {
        const deadline = new Date(body.deadline);
        if (Number.isNaN(deadline.getTime())) {
          return res.status(400).json({ error: "Prazo inválido." });
        }
        data.deadline = deadline;
      }

      if (Object.keys(data).length === 0) {
        return res.status(400).json({ error: "Nada para atualizar." });
      }

      const updated = await prisma.feedbackCampaign.update({
        where: { id: campaignId },
        data,
      });

      await logFeedbackAudit({
        campaignId,
        actor,
        action: "CAMPAIGN_UPDATED",
        metadata: { fields: Object.keys(data) },
      });

      return res.status(200).json({ campaign: updated });
    } catch (error) {
      if (error instanceof FeedbackServiceError) {
        return res.status(error.status).json({ error: error.message });
      }
      console.error("Erro ao atualizar campanha:", error);
      return res.status(500).json({ error: "Erro ao atualizar campanha." });
    }
  }

  res.setHeader("Allow", "GET, PATCH");
  return res.status(405).json({ error: "Method Not Allowed" });
}
