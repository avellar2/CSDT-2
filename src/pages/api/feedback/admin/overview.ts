import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/utils/prisma";
import { requireFeedbackAdmin } from "@/utils/feedback/adminAuth";
import {
  computeParticipation,
  getFeedbackDashboardSnapshot,
  listCampaignSummaries,
} from "@/utils/feedback/adminQueries";
import { getRecipientPlan } from "@/utils/feedback/service";
import { summarizeRecipientPlan } from "@/utils/feedback/recipients";
import { feedbackQueueWorkerEnabled, feedbackSenderAddress } from "@/utils/feedback/config";

/** Números da visão geral do painel administrativo. */
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
    const plan = await getRecipientPlan();
    const [
      participation,
      campaigns,
      recentFailures,
      recentAudit,
      dashboard,
      responseGroups,
    ] = await Promise.all([
        computeParticipation(),
        listCampaignSummaries(),
        prisma.feedbackInvite.findMany({
          where: { status: "FAILED" },
          orderBy: { updatedAt: "desc" },
          take: 10,
          select: {
            id: true,
            schoolId: true,
            recipientEmail: true,
            lastError: true,
            updatedAt: true,
            School: { select: { name: true } },
            Campaign: { select: { id: true, name: true } },
          },
        }),
        prisma.feedbackAuditLog.findMany({
          orderBy: { createdAt: "desc" },
          take: 15,
          select: {
            id: true,
            action: true,
            actorName: true,
            actorRole: true,
            campaignId: true,
            createdAt: true,
          },
        }),
        getFeedbackDashboardSnapshot(actor.userId),
        prisma.feedbackResponse.groupBy({
          by: ["channel"],
          _count: { _all: true },
        }),
      ]);

    const responseCounts = {
      official:
        responseGroups.find((group) => group.channel === "OFFICIAL")?._count
          ._all ?? 0,
      test:
        responseGroups.find((group) => group.channel === "TEST")?._count._all ?? 0,
    };

    const officialCampaigns = campaigns.filter(
      (campaign) => campaign.channel === "OFFICIAL",
    );

    return res.status(200).json({
      eligibility: summarizeRecipientPlan(plan),
      participation: {
        ...participation,
        unansweredSchools: Math.max(
          0,
          participation.invitationsTotal - participation.responses,
        ),
      },
      dashboard,
      responseCounts,
      campaigns: officialCampaigns.slice(0, 20),
      recentFailures,
      recentAudit,
      system: {
        smtpConfigured: Boolean(feedbackSenderAddress()),
        workerEnabled: feedbackQueueWorkerEnabled(),
        testRecipient: "vandersonavellar1997@gmail.com",
      },
    });
  } catch (error) {
    console.error("Erro ao carregar visão geral:", error);
    return res.status(500).json({ error: "Erro ao carregar visão geral." });
  }
}
