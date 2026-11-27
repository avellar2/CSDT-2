import type { NextApiRequest, NextApiResponse } from "next";
import { requireRole, AUTH_ROLES } from "@/utils/api-auth";
import { sendMail, MailConfigurationError } from "@/utils/mailer";
import prisma from "@/utils/prisma";
import { authorizeOsExterna } from "@/utils/osExternaAuthorization";
import { evaluateMailAcceptance, normalizeAddress } from "@/utils/mailRecipients";

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

/**
 * E-mail INICIAL da OS é idempotente para sempre: se a OS já tem
 * `lastEmailSent`, não envia de novo, independentemente do dia. O reenvio
 * manual autorizado usa `/api/resend-os-email`, que tem o seu próprio
 * cooldown e continua funcionando.
 */
function emailAlreadySent(lastEmailSent: Date | null): boolean {
  return Boolean(lastEmailSent);
}

/**
 * Compatibilidade com clientes antigos que não enviavam `osExternaNumero`:
 * o assunto padrão da OS contém o número (`OS Externa 123/2026 - Escola`).
 */
function extractOsNumberFromSubject(subject: unknown): string | null {
  if (typeof subject !== "string") return null;
  const match = subject.match(/\b(\d{1,8}\/\d{4})\b/);
  return match ? match[1] : null;
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
  const osExternaNumero =
    typeof req.body?.osExternaNumero === "string" && req.body.osExternaNumero.trim()
      ? req.body.osExternaNumero.trim()
      : null;

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

  // Todo e-mail deste endpoint pertence a uma OS. O número explícito é o
  // caminho novo; o assunto é o fallback para clientes antigos em cache.
  const resolvedOsNumber =
    osExternaNumero || extractOsNumberFromSubject(subject);

  if (!resolvedOsNumber) {
    return res.status(403).json({
      error:
        "O envio de e-mail precisa estar vinculado a uma OS (informe osExternaNumero).",
    });
  }

  // Idempotência e autorização do e-mail da OS.
  let osExterna: {
    id: number;
    lastEmailSent: Date | null;
    status: string;
    routeId: number | null;
    data: string;
    createdAt: Date;
    tecnicoResponsavel: string | null;
    unidadeEscolar: string | null;
    emailResponsavel: string | null;
  } | null = null;

  if (resolvedOsNumber) {
    try {
      osExterna = await prisma.oSExterna.findUnique({
        where: { numeroOs: resolvedOsNumber },
        select: {
          id: true,
          lastEmailSent: true,
          status: true,
          routeId: true,
          data: true,
          createdAt: true,
          tecnicoResponsavel: true,
          unidadeEscolar: true,
          emailResponsavel: true,
        },
      });
    } catch (lookupError) {
      console.error("Falha ao carregar a OS do e-mail:", lookupError);
      return res.status(500).json({ error: "Erro ao validar a OS do e-mail." });
    }

    if (!osExterna) {
      return res.status(404).json({ error: "OS não encontrada." });
    }

    const permission = await authorizeOsExterna(auth, osExterna);
    if (!permission.allowed) {
      return res.status(403).json({ error: permission.reason });
    }

    // O e-mail da OS vai para o endereço cadastrado nela. Evita usar o SMTP
    // institucional como relay para qualquer destinatário.
    if (
      osExterna.emailResponsavel &&
      normalizeAddress(to) !== normalizeAddress(osExterna.emailResponsavel)
    ) {
      return res.status(403).json({
        error:
          "O destinatário não corresponde ao e-mail cadastrado para esta OS.",
      });
    }

    if (emailAlreadySent(osExterna.lastEmailSent)) {
      return res.status(200).json({
        message: "Email ja enviado para esta OS.",
        deduplicated: true,
        emailPreviouslySent: true,
        lastEmailSent: osExterna.lastEmailSent,
      });
    }
  }

  try {
    const ccString = typeof cc === "string" ? cc.trim() : "";
    const result = await sendMail({
      to: to.trim(),
      cc: ccString || undefined,
      subject: subject.trim(),
      html: typeof html === "string" ? html : "",
      text: typeof text === "string" ? text : "",
      replyTo: typeof replyTo === "string" && replyTo.trim() ? replyTo.trim() : undefined,
      attachments: normalizedAttachments.length
        ? normalizedAttachments
        : undefined,
    });

    const acceptance = evaluateMailAcceptance(result, to, ccString);

    if (!acceptance.mainAccepted) {
      console.error(
        "Envio de e-mail da OS sem aceite do destinatário principal.",
        {
          acceptedCount: acceptance.acceptedCount,
          rejectedCount: acceptance.rejectedCount,
        },
      );
      return res.status(502).json({
        error:
          "O destinatário principal não foi aceito pelo servidor de e-mail. O envio não foi confirmado.",
        mainAccepted: false,
        rejectedCount: acceptance.rejectedCount,
      });
    }

    if (osExterna) {
      try {
        await prisma.oSExterna.update({
          where: { id: osExterna.id },
          data: { lastEmailSent: new Date() },
        });
      } catch (markError) {
        console.error("Falha ao registrar envio de e-mail da OS:", markError);
      }
    }

    res.status(200).json({
      message: "Email enviado com sucesso!",
      messageId: result.messageId,
      accepted: result.accepted,
      rejected: result.rejected,
      response: result.response,
      mainAccepted: true,
      ccStatus: acceptance.ccStatus,
      ccRejectedCount: acceptance.ccRejectedCount,
    });
  } catch (error) {
    if (error instanceof MailConfigurationError) {
      return res.status(503).json({ error: error.message });
    }
    console.error("Erro ao enviar o email:", error);
    res.status(502).json({ error: "Erro ao enviar o email" });
  }
}
