import type { NextApiRequest, NextApiResponse } from "next";
import { requireFeedbackAdmin, requestBaseUrl } from "@/utils/feedback/adminAuth";
import {
  FEEDBACK_TEST_RECIPIENT,
  feedbackSurveyPath,
} from "@/utils/feedback/config";
import {
  buildFeedbackInviteEmail,
  formatDeadlineLabel,
  isAuthorizedTestRecipient,
} from "@/utils/feedback/email";
import {
  FeedbackServiceError,
  sendTestEmail,
} from "@/utils/feedback/service";

/**
 * Envio de teste: único destinatário autorizado. Cada teste cria uma campanha
 * TEST isolada, então respostas de teste nunca entram nas estatísticas.
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  const actor = await requireFeedbackAdmin(req, res);
  if (!actor) return;

  const baseUrl = requestBaseUrl(req);

  if (req.method === "GET") {
    const preview = buildFeedbackInviteEmail({
      schoolLinks: [
        {
          schoolName: "CSDT — Teste",
          url: `${baseUrl}${feedbackSurveyPath("TOKEN_DE_EXEMPLO_DO_TESTE")}`,
        },
      ],
      deadlineLabel: formatDeadlineLabel(null),
      recipientEmail: FEEDBACK_TEST_RECIPIENT,
      isTest: true,
      baseUrl,
    });
    return res.status(200).json({
      recipient: FEEDBACK_TEST_RECIPIENT,
      preview,
    });
  }

  if (req.method !== "POST") {
    res.setHeader("Allow", "GET, POST");
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const body = req.body ?? {};

  // Defesa em profundidade: nada além do endereço autorizado.
  if (body.to !== undefined) {
    if (typeof body.to !== "string" || !isAuthorizedTestRecipient(body.to)) {
      return res.status(403).json({
        error: `Envio de teste permitido apenas para ${FEEDBACK_TEST_RECIPIENT}.`,
      });
    }
  }

  // Deliberadamente NÃO envia automaticamente ao iniciar servidor, migration
  // ou deploy. Só executa quando esta rota é chamada por um ADMTOTAL.
  try {
    const result = await sendTestEmail({
      actor,
      baseUrl,
      subject: typeof body.subject === "string" ? body.subject : undefined,
      introText: typeof body.introText === "string" ? body.introText : undefined,
    });

    return res.status(200).json({
      recipient: FEEDBACK_TEST_RECIPIENT,
      cc: "csdt@smeduquedecaxias.rj.gov.br",
      campaignId: result.campaignId,
      inviteId: result.inviteId,
      url: result.url,
      accepted: result.accepted,
      rejected: result.rejected,
      primaryAccepted: result.primaryAccepted,
      ccStatus: result.ccStatus,
      ccError: result.ccError,
      messageId: result.messageId,
      smtpResponse: result.response,
      subject: result.subject,
      html: result.html,
      text: result.text,
      note:
        result.primaryAccepted
          ? "O servidor SMTP aceitou o destinatário principal. Isso não confirma entrega na caixa de entrada."
          : "O servidor SMTP não aceitou o destinatário principal do teste.",
    });
  } catch (error) {
    if (error instanceof FeedbackServiceError) {
      return res.status(error.status).json({ error: error.message });
    }
    console.error("Erro no envio de teste:", error);
    return res.status(500).json({ error: "Erro no envio de teste." });
  }
}
