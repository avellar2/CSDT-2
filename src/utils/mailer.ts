import nodemailer, { type Transporter } from "nodemailer";
import type SMTPTransport from "nodemailer/lib/smtp-transport";

/**
 * Serviço interno de envio de e-mails.
 *
 * Único ponto do sistema que fala com o SMTP. O remetente é sempre o
 * configurado em EMAIL_USER; destinatários, HTML e remetente nunca vêm
 * diretamente de uma requisição pública.
 */

export interface MailAttachment {
  filename: string;
  content: string | Buffer;
  encoding?: string;
  contentType?: string;
}

export interface MailMessage {
  to: string;
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
  fromName?: string;
  headers?: Record<string, string>;
  attachments?: MailAttachment[];
}

export interface MailSendResult {
  messageId: string;
  accepted: string[];
  rejected: string[];
  response: string;
}

export class MailConfigurationError extends Error {}

function assertMailerConfigured() {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    throw new MailConfigurationError(
      "SMTP não configurado: defina EMAIL_USER e EMAIL_PASS.",
    );
  }
}

export function getMailer(): Transporter {
  assertMailerConfigured();
  const options: SMTPTransport.Options = {
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  };
  return nodemailer.createTransport(options);
}

/** Verifica as credenciais SMTP sem enviar mensagem. */
export async function verifyMailer(): Promise<boolean> {
  assertMailerConfigured();
  const transporter = getMailer();
  try {
    return await transporter.verify();
  } finally {
    transporter.close?.();
  }
}

function formatFrom(fromName?: string): string {
  const address = process.env.EMAIL_USER as string;
  if (!fromName) return address;
  return `"${fromName.replace(/"/g, "")}" <${address}>`;
}

export async function sendMail(message: MailMessage): Promise<MailSendResult> {
  const transporter = getMailer();
  try {
    const info = await transporter.sendMail({
      from: formatFrom(message.fromName ?? "CSDT - Suporte Tecnológico"),
      to: message.to,
      replyTo: message.replyTo || process.env.EMAIL_REPLY_TO || process.env.EMAIL_USER,
      subject: message.subject,
      text: message.text,
      html: message.html,
      headers: message.headers,
      attachments: message.attachments?.map((attachment) => ({
        filename: attachment.filename,
        content: attachment.content,
        encoding: attachment.encoding,
        contentType: attachment.contentType,
      })),
    });

    return {
      messageId: String(info.messageId ?? ""),
      accepted: Array.isArray(info.accepted)
        ? info.accepted.map(String)
        : [],
      rejected: Array.isArray(info.rejected)
        ? info.rejected.map(String)
        : [],
      response: String(info.response ?? ""),
    };
  } finally {
    transporter.close?.();
  }
}

/**
 * Classifica um erro de SMTP para a fila.
 * 4xx e erros de rede são temporários; 5xx relativos ao destinatário são
 * definitivos. Erros de autenticação são definitivos.
 */
export function classifySmtpError(error: unknown): {
  kind: "TEMPORARY" | "PERMANENT";
  message: string;
  responseCode?: number;
} {
  const err = (error ?? {}) as {
    responseCode?: number;
    code?: string;
    message?: string;
  };
  const message = String(err.message || "Erro desconhecido no envio.").slice(
    0,
    500,
  );

  const code = typeof err.responseCode === "number" ? err.responseCode : undefined;

  if (code) {
    if (code >= 400 && code < 500) return { kind: "TEMPORARY", message, responseCode: code };
    if (code >= 500) return { kind: "PERMANENT", message, responseCode: code };
  }

  if (err.code) {
    const temporaryCodes = new Set([
      "ETIMEDOUT",
      "ESOCKET",
      "ECONNECTION",
      "ECONNRESET",
      "EENVELOPE",
      "ENOTFOUND",
      "EPIPE",
      "EDNS",
      "EAUTH", // credencial inválida: não adianta repetir por destinatário
    ]);
    if (temporaryCodes.has(err.code)) {
      return {
        kind: err.code === "EAUTH" ? "PERMANENT" : "TEMPORARY",
        message,
      };
    }
  }

  // Default conservador: trata como temporário para permitir retry limitado.
  return { kind: "TEMPORARY", message };
}

export function computeBackoffDelayMs(attempt: number): number {
  const baseMinutes = Math.min(120, 5 * Math.pow(2, Math.max(0, attempt - 1)));
  return baseMinutes * 60 * 1000;
}
