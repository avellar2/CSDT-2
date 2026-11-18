import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/utils/prisma";
import { requireFeedbackAdmin } from "@/utils/feedback/adminAuth";

/** Trilha de auditoria das ações administrativas da pesquisa. */
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
    const page = Math.max(1, Number(req.query.page) || 1);
    const pageSize = Math.min(Math.max(Number(req.query.pageSize) || 50, 1), 200);

    const where =
      Number.isInteger(campaignId) && campaignId > 0 ? { campaignId } : {};

    const [total, entries] = await Promise.all([
      prisma.feedbackAuditLog.count({ where }),
      prisma.feedbackAuditLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true,
          campaignId: true,
          actorUserId: true,
          actorName: true,
          actorRole: true,
          action: true,
          inviteId: true,
          metadata: true,
          createdAt: true,
        },
      }),
    ]);

    return res.status(200).json({ page, pageSize, total, entries });
  } catch (error) {
    console.error("Erro ao listar auditoria:", error);
    return res.status(500).json({ error: "Erro ao listar auditoria." });
  }
}
