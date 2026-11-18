import type { NextApiRequest, NextApiResponse } from "next";
import { requireFeedbackAdmin } from "@/utils/feedback/adminAuth";
import { listComments, listDistricts } from "@/utils/feedback/adminQueries";

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
    const questionKey =
      req.query.questionKey === "q14" || req.query.questionKey === "q16"
        ? req.query.questionKey
        : undefined;

    const result = await listComments({
      campaignId: Number.isInteger(campaignId) && campaignId > 0 ? campaignId : undefined,
      district: typeof req.query.district === "string" ? req.query.district : undefined,
      schoolQuery: typeof req.query.school === "string" ? req.query.school : undefined,
      textQuery: typeof req.query.q === "string" ? req.query.q : undefined,
      questionKey,
      includeTest: req.query.includeTest === "1",
      page: Number(req.query.page) || 1,
      pageSize: Number(req.query.pageSize) || 25,
    });

    const districts = await listDistricts();
    return res.status(200).json({ ...result, districts });
  } catch (error) {
    console.error("Erro ao listar comentários:", error);
    return res.status(500).json({ error: "Erro ao listar comentários." });
  }
}
