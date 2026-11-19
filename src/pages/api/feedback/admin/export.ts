import type { NextApiRequest, NextApiResponse } from "next";
import { requireFeedbackAdmin } from "@/utils/feedback/adminAuth";
import { loadExportRows } from "@/utils/feedback/adminQueries";
import { buildResponsesCsv } from "@/utils/feedback/csv";
import { logFeedbackAudit } from "@/utils/feedback/service";

/** Exportação CSV restrita a ADMTOTAL, respeitando os filtros aplicados. */
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
    const channel: "OFFICIAL" | "TEST" | undefined =
      req.query.channel === "OFFICIAL" || req.query.channel === "TEST"
        ? req.query.channel
        : undefined;
    const filters = {
      campaignId: Number.isInteger(campaignId) && campaignId > 0 ? campaignId : undefined,
      district: typeof req.query.district === "string" ? req.query.district : undefined,
      schoolQuery: typeof req.query.q === "string" ? req.query.q : undefined,
      includeTest: req.query.includeTest === "1",
      channel,
    };

    const rows = await loadExportRows(filters);
    const csv = buildResponsesCsv(rows);

    await logFeedbackAudit({
      campaignId: filters.campaignId ?? null,
      actor,
      action: "RESPONSES_EXPORTED",
      metadata: {
        rows: rows.length,
        filters: {
          campaignId: filters.campaignId ?? null,
          district: filters.district ?? null,
          schoolQuery: filters.schoolQuery ?? null,
          channel: filters.channel ?? (filters.includeTest ? "ALL" : "OFFICIAL"),
        },
      },
    });

    const filename = `pesquisa-feedback-csdt-${new Date()
      .toISOString()
      .slice(0, 10)}.csv`;

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${filename}"`,
    );
    res.setHeader("Cache-Control", "no-store");
    return res.status(200).send(csv);
  } catch (error) {
    console.error("Erro ao exportar respostas:", error);
    return res.status(500).json({ error: "Erro ao exportar respostas." });
  }
}
