import type { NextApiRequest, NextApiResponse } from "next";
import { requireFeedbackAdmin } from "@/utils/feedback/adminAuth";
import {
  FeedbackServiceError,
  processFeedbackQueue,
  type AuditActor,
} from "@/utils/feedback/service";
import { feedbackAppBaseUrl, feedbackQueueWorkerEnabled } from "@/utils/feedback/config";

/**
 * Processa um lote pequeno da fila persistente.
 *
 * Pode ser chamado por:
 * - ADMTOTAL autenticado (botão "Processar lote" no painel);
 * - Vercel Cron, com Authorization: Bearer $CRON_SECRET.
 *
 * Nunca processa em loop e nunca envia se o worker estiver desabilitado.
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "POST" && req.method !== "GET") {
    res.setHeader("Allow", "GET, POST");
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const cronSecret = process.env.CRON_SECRET;
  const authorization = req.headers.authorization;
  let actor: AuditActor | null = null;

  if (
    cronSecret &&
    typeof authorization === "string" &&
    authorization === `Bearer ${cronSecret}`
  ) {
    actor = { userId: "system:cron", name: "Vercel Cron", role: "SYSTEM" };
  } else {
    actor = await requireFeedbackAdmin(req, res);
  }
  if (!actor) return;

  if (!feedbackQueueWorkerEnabled()) {
    return res.status(503).json({
      error:
        "Worker de envio desabilitado. Defina FEEDBACK_QUEUE_WORKER_ENABLED=true para habilitar.",
    });
  }

  try {
    const limitRaw = Number(req.query.limit ?? req.body?.limit);
    const result = await processFeedbackQueue({
      limit: Number.isFinite(limitRaw) && limitRaw > 0 ? limitRaw : undefined,
      baseUrl: feedbackAppBaseUrl(req.headers.host),
    });
    return res.status(200).json(result);
  } catch (error) {
    if (error instanceof FeedbackServiceError) {
      return res.status(error.status).json({ error: error.message });
    }
    console.error("Erro ao processar fila de envio:", error);
    return res.status(500).json({ error: "Erro ao processar fila." });
  }
}
