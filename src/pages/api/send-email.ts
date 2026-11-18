import type { NextApiRequest, NextApiResponse } from "next";
import { requireRole, AUTH_ROLES } from "@/utils/api-auth";
import { sendMail, MailConfigurationError } from "@/utils/mailer";

/**
 * Endpoint genérico de e-mail usado pelos fluxos de OS e chamados.
 *
 * Correção de segurança: a checagem de autenticação estava dentro do bloco
 * `if (req.method !== 'POST')`, portanto nunca era executada em requisições
 * POST válidas — qualquer anônimo podia enviar e-mail arbitrário. A checagem
 * agora acontece antes de qualquer processamento.
 *
 * Endpoints internos (chamados técnicos) passaram a chamar o serviço interno
 * `sendMail` diretamente, sem HTTP para si mesmos.
 */

const MAX_ATTACHMENTS = 5;
const MAX_ATTACHMENT_BASE64_BYTES = 8 * 1024 * 1024;

function isValidRecipient(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const trimmed = value.trim();
  if (trimmed.length > 320) return false;
  return /^[^\s@,]+@[^\s@,]+\.[^\s@,]+$/.test(trimmed);
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  // Somente operadores autenticados. Nunca aceitar remetente do corpo.
  const auth = await requireRole(req, res, [
    AUTH_ROLES.ADMIN,
    AUTH_ROLES.ADMTOTAL,
    AUTH_ROLES.TECH,
  ]);
  if (!auth) return;

  const { to, cc, replyTo, subject, text, html, attachments } = req.body ?? {};

  if (!isValidRecipient(to)) {
    return res.status(400).json({ error: "Destinatário inválido." });
  }
  if (typeof subject !== "string" || !subject.trim() || subject.length > 300) {
    return res.status(400).json({ error: "Assunto inválido." });
  }
  if (typeof html !== "string" && typeof text !== "string") {
    return res.status(400).json({ error: "Conteúdo do e-mail ausente." });
  }

  let normalizedAttachments: Array<{
    filename: string;
    content: string;
    encoding?: string;
    contentType?: string;
  }> = [];

  if (attachments !== undefined) {
    if (!Array.isArray(attachments) || attachments.length > MAX_ATTACHMENTS) {
      return res.status(400).json({ error: "Anexos inválidos." });
    }
    normalizedAttachments = attachments.map((attachment) => {
      const filename =
        typeof attachment?.filename === "string"
          ? attachment.filename.slice(0, 200)
          : "anexo.pdf";
      const content = typeof attachment?.content === "string" ? attachment.content : "";
      return {
        filename,
        content,
        encoding: attachment?.encoding || "base64",
        contentType: attachment?.contentType || "application/pdf",
      };
    });

    const totalBytes = normalizedAttachments.reduce(
      (acc, attachment) => acc + attachment.content.length,
      0,
    );
    if (totalBytes > MAX_ATTACHMENT_BASE64_BYTES) {
      return res.status(413).json({ error: "Anexos excedem o limite permitido." });
    }
  }

  try {
    const result = await sendMail({
      to: to.trim(),
      subject: subject.trim(),
      html: typeof html === "string" ? html : "",
      text: typeof text === "string" ? text : "",
      replyTo: typeof replyTo === "string" && replyTo.trim() ? replyTo.trim() : undefined,
      headers:
        typeof cc === "string" && cc.trim() ? { Cc: cc.trim() } : undefined,
      attachments: normalizedAttachments.length
        ? normalizedAttachments
        : undefined,
    });

    res.status(200).json({
      message: "Email enviado com sucesso!",
      messageId: result.messageId,
      accepted: result.accepted,
      rejected: result.rejected,
      response: result.response,
    });
  } catch (error) {
    if (error instanceof MailConfigurationError) {
      return res.status(503).json({ error: error.message });
    }
    console.error("Erro ao enviar o email:", error);
    res.status(502).json({ error: "Erro ao enviar o email" });
  }
}
