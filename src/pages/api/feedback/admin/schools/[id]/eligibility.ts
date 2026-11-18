import type { NextApiRequest, NextApiResponse } from "next";
import { requireFeedbackAdmin } from "@/utils/feedback/adminAuth";
import {
  FeedbackServiceError,
  setSchoolEligibilityOverride,
} from "@/utils/feedback/service";
import type { SchoolUnitType } from "@/utils/feedback/schoolEligibility";

const TYPES = new Set(["SCHOOL", "ADMIN_SECTOR", "REVIEW"]);

/**
 * Override manual e auditado da classificação de uma unidade.
 * Existe para exceções reais (ex.: unidade educacional cadastrada em SEDE),
 * sempre com motivo e registro em auditoria.
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  const actor = await requireFeedbackAdmin(req, res);
  if (!actor) return;

  if (req.method !== "PATCH") {
    res.setHeader("Allow", "PATCH");
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const schoolId = Number(req.query.id);
  if (!Number.isInteger(schoolId) || schoolId <= 0) {
    return res.status(400).json({ error: "Unidade inválida." });
  }

  const body = req.body ?? {};
  if (typeof body.eligible !== "boolean") {
    return res.status(400).json({ error: "Informe eligible (true/false)." });
  }
  const reason = typeof body.reason === "string" ? body.reason.trim() : "";
  if (reason.length < 5) {
    return res
      .status(400)
      .json({ error: "Informe um motivo com pelo menos 5 caracteres." });
  }

  const type =
    typeof body.type === "string" && TYPES.has(body.type)
      ? (body.type as SchoolUnitType)
      : undefined;

  try {
    const result = await setSchoolEligibilityOverride({
      schoolId,
      eligible: body.eligible,
      type,
      reason,
      actor,
    });
    return res.status(200).json(result);
  } catch (error) {
    if (error instanceof FeedbackServiceError) {
      return res.status(error.status).json({ error: error.message });
    }
    console.error("Erro ao alterar elegibilidade da unidade:", error);
    return res.status(500).json({ error: "Erro ao alterar elegibilidade." });
  }
}
