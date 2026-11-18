import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/utils/prisma";
import { requireFeedbackAdmin } from "@/utils/feedback/adminAuth";
import {
  authorizeCampaignSend,
  excludeIneligibleInvites,
  FeedbackServiceError,
} from "@/utils/feedback/service";
import { feedbackQueueWorkerEnabled } from "@/utils/feedback/config";

const CONFIRMATION_PHRASE = "ENVIAR PESQUISA ÀS ESCOLAS";

/**
 * Autoriza o disparo geral. Exige confirmação explícita e confere o número de
 * mensagens previsto, para que nenhuma alteração silenciosa de destinatários
 * resulte em envio inesperado.
 *
 * Importante: esta rota apenas autoriza/enfileira. O envio ocorre em lotes por
 * /api/feedback/admin/queue e exige FEEDBACK_QUEUE_WORKER_ENABLED=true.
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  const actor = await requireFeedbackAdmin(req, res);
  if (!actor) return;

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const campaignId = Number(req.query.id);
  if (!Number.isInteger(campaignId) || campaignId <= 0) {
    return res.status(400).json({ error: "Campanha inválida." });
  }

  const body = req.body ?? {};
  if (body.confirm !== true || body.confirmationText !== CONFIRMATION_PHRASE) {
    return res.status(400).json({
      error:
        "Confirmação explícita obrigatória. Envie confirm=true e a frase exata de confirmação.",
    });
  }

  try {
    // Revalida os destinatários antes de qualquer confirmação: setores
    // administrativos nunca entram em campanha oficial.
    const exclusion = await excludeIneligibleInvites(campaignId, actor);

    const totalJobs = await prisma.feedbackSendJob.count({
      where: { campaignId, status: { not: "CANCELLED" } },
    });
    const expected = Number(body.expectedMessages);
    if (!Number.isFinite(expected) || expected !== totalJobs) {
      return res.status(409).json({
        error:
          "O número de destinatários elegíveis mudou desde a pré-visualização. Abra a pré-visualização novamente e confirme.",
        expectedMessages: totalJobs,
        excludedInvites: exclusion.excluded,
        excludedNames: exclusion.names,
      });
    }

    const result = await authorizeCampaignSend(campaignId, actor);
    return res.status(200).json({
      ...result,
      workerEnabled: feedbackQueueWorkerEnabled(),
      message: feedbackQueueWorkerEnabled()
        ? "Envio autorizado. As mensagens serão processadas em lotes pela fila."
        : "Envio autorizado, mas o worker está desabilitado (FEEDBACK_QUEUE_WORKER_ENABLED). Nenhuma mensagem será enviada até habilitar.",
    });
  } catch (error) {
    if (error instanceof FeedbackServiceError) {
      return res.status(error.status).json({ error: error.message });
    }
    console.error("Erro ao autorizar envio:", error);
    return res.status(500).json({ error: "Erro ao autorizar envio." });
  }
}
