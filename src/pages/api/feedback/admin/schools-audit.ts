import type { NextApiRequest, NextApiResponse } from "next";
import { requireFeedbackAdmin } from "@/utils/feedback/adminAuth";
import {
  auditSchoolEligibility,
  FeedbackServiceError,
  getRecipientPlan,
} from "@/utils/feedback/service";
import { summarizeRecipientPlan } from "@/utils/feedback/recipients";

/**
 * Auditoria da base de School para a Pesquisa de Feedback.
 *
 * GET  — relatório (dry-run): quantas unidades escolares, setores e ambíguos.
 * POST — persiste a classificação (surveyUnitType/surveyEligible/...) na
 *        própria School, congelando a decisão auditada.
 *
 * A persistência é aditiva e não altera nenhum outro campo do cadastro.
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  const actor = await requireFeedbackAdmin(req, res);
  if (!actor) return;

  if (req.method === "GET") {
    try {
      const [audit, plan] = await Promise.all([
        auditSchoolEligibility(actor, false),
        getRecipientPlan(),
      ]);
      return res.status(200).json({
        summary: audit.summary,
        recipients: summarizeRecipientPlan(plan),
        items: audit.items,
      });
    } catch (error) {
      console.error("Erro na auditoria de escolas:", error);
      return res.status(500).json({ error: "Erro na auditoria de escolas." });
    }
  }

  if (req.method === "POST") {
    try {
      if (req.body?.persist !== true) {
        return res.status(400).json({
          error:
            "Confirmação obrigatória: envie { persist: true } para gravar a classificação.",
        });
      }
      const audit = await auditSchoolEligibility(actor, true);
      const plan = await getRecipientPlan();
      return res.status(200).json({
        summary: audit.summary,
        recipients: summarizeRecipientPlan(plan),
        items: audit.items,
      });
    } catch (error) {
      if (error instanceof FeedbackServiceError) {
        return res.status(error.status).json({ error: error.message });
      }
      console.error("Erro ao persistir auditoria de escolas:", error);
      return res.status(500).json({ error: "Erro ao persistir auditoria." });
    }
  }

  res.setHeader("Allow", "GET, POST");
  return res.status(405).json({ error: "Method Not Allowed" });
}
