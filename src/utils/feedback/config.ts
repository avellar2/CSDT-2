/**
 * Configuração central da Pesquisa de Feedback do CSDT.
 */

/** Único destinatário autorizado para envios de teste durante o desenvolvimento. */
export const FEEDBACK_TEST_RECIPIENT = "vandersonavellar1997@gmail.com";

export const FEEDBACK_ADMIN_ROLES = ["ADMTOTAL"] as const;

export const FEEDBACK_DEFAULT_SUBJECT =
  "CSDT | Pesquisa de Feedback — Sua opinião é importante";

export const FEEDBACK_DEFAULT_INTRO =
  "O Centro de Suporte e Desenvolvimento Tecnológico (CSDT), da Secretaria Municipal de Educação, convida sua unidade escolar a participar de nossa Pesquisa de Feedback.";

/** Validade padrão do link público, em dias, quando a campanha não define prazo. */
export const FEEDBACK_TOKEN_TTL_DAYS = 60;

/** Quantidade máxima de convites criados por campanha (proteção). */
export const FEEDBACK_MAX_RECIPIENTS = 1000;

/** Limite de mensagens enviadas por execução do worker de fila. */
export const FEEDBACK_QUEUE_BATCH_SIZE = 10;

/** Limite de requisições por janela por IP no formulário público. */
export const FEEDBACK_RATE_LIMIT_MAX = 30;
export const FEEDBACK_RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;

/** Limites de caracteres (defesa em profundidade; frontend replica). */
export const FEEDBACK_MAX_NAME_LENGTH = 160;
export const FEEDBACK_MAX_REGISTRATION_LENGTH = 40;
export const FEEDBACK_MAX_ROLE_LENGTH = 120;
export const FEEDBACK_MAX_OPEN_ANSWER_LENGTH = 2000;
export const FEEDBACK_MAX_OTHER_LENGTH = 300;

/**
 * O worker de fila só envia quando explicitamente habilitado. Isso evita que
 * um deploy ou cron dispare mensagens reais sem autorização do operador.
 */
export function feedbackQueueWorkerEnabled(): boolean {
  return process.env.FEEDBACK_QUEUE_WORKER_ENABLED === "true";
}

/** Remetente institucional usado nos convites. */
export function feedbackSenderAddress(): string {
  return process.env.EMAIL_USER || "";
}

export function feedbackReplyTo(): string | undefined {
  return process.env.EMAIL_REPLY_TO || process.env.EMAIL_USER || undefined;
}

/**
 * URL pública da aplicação. Usada para montar o link do convite e a URL
 * absoluta do logotipo no HTML do e-mail.
 */
export function feedbackAppBaseUrl(reqHost?: string): string {
  const explicit = process.env.FEEDBACK_APP_URL || process.env.NEXT_PUBLIC_APP_URL;
  if (explicit) return explicit.replace(/\/+$/, "");
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  if (reqHost) {
    const protocol = reqHost.startsWith("localhost") || reqHost.startsWith("127.")
      ? "http"
      : "https";
    return `${protocol}://${reqHost}`;
  }
  return "http://localhost:3000";
}

export function feedbackSurveyPath(token: string): string {
  return `/pesquisa/csdt/${encodeURIComponent(token)}`;
}
