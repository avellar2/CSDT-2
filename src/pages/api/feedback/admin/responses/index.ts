import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/utils/prisma";
import { requireFeedbackAdmin } from "@/utils/feedback/adminAuth";
import {
  listDistricts,
  listResponses,
  type ResponseChannel,
} from "@/utils/feedback/adminQueries";

function parseChannel(value: unknown): ResponseChannel | undefined {
  return value === "OFFICIAL" || value === "TEST" ? value : undefined;
}

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
    const channel = parseChannel(req.query.channel);

    const result = await listResponses({
      campaignId: Number.isInteger(campaignId) && campaignId > 0 ? campaignId : undefined,
      district: typeof req.query.district === "string" ? req.query.district : undefined,
      schoolQuery: typeof req.query.q === "string" ? req.query.q : undefined,
      // Compatibilidade: includeTest=1 continua mostrando todos os canais.
      includeTest: req.query.includeTest === "1",
      channel,
      page: Number(req.query.page) || 1,
      pageSize: Number(req.query.pageSize) || 25,
    });

    const [districts, officialCount, testCount] = await Promise.all([
      listDistricts(),
      prisma.feedbackResponse.count({ where: { channel: "OFFICIAL" } }),
      prisma.feedbackResponse.count({ where: { channel: "TEST" } }),
    ]);

    return res.status(200).json({
      ...result,
      districts,
      counts: { official: officialCount, test: testCount },
    });
  } catch (error) {
    console.error("Erro ao listar respostas:", error);
    return res.status(500).json({ error: "Erro ao listar respostas." });
  }
}
