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
export const FEEDBACK_QUEUE_BATCH_SIZE = 5;

/**
 * Contato institucional fixo dos convites. Não depende de EMAIL_USER: o
 * remetente SMTP continua sendo a conta autenticada, mas Reply-To/CC/rodapé
 * apontam para o CSDT.
 */
export const FEEDBACK_INSTITUTIONAL_CONTACT =
  "csdt@smeduquedecaxias.rj.gov.br";

/** Cópia institucional de cada mensagem oficial. */
export const FEEDBACK_OFFICIAL_CC = FEEDBACK_INSTITUTIONAL_CONTACT;

/**
 * Host canônico de produção. Campanhas oficiais só podem gerar links HTTPS
 * neste domínio (ou nos hosts extras de FEEDBACK_ALLOWED_HOSTS).
 */
export const FEEDBACK_PRODUCTION_HOST = "csdt.vercel.app";

export class FeedbackBaseUrlError extends Error {}

function allowedOfficialHosts(): string[] {
  const configured = process.env.FEEDBACK_ALLOWED_HOSTS;
  if (configured) {
    const hosts = configured
      .split(",")
      .map((host) => host.trim().toLowerCase())
      .filter(Boolean);
    if (hosts.length > 0) return hosts;
  }
  return [FEEDBACK_PRODUCTION_HOST];
}

function isPrivateHost(host: string): boolean {
  if (
    host === "localhost" ||
    host === "127.0.0.1" ||
    host === "0.0.0.0" ||
    host === "::1" ||
    host.endsWith(".local") ||
    host.endsWith(".internal")
  ) {
    return true;
  }
  if (/^10\./.test(host)) return true;
  if (/^192\.168\./.test(host)) return true;
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(host)) return true;
  return false;
}

/**
 * Valida a URL usada nos links de campanhas OFICIAIS.
 *
 * Bloqueia: vazia, HTTP, localhost/loopback/rede privada, domínio fora da
 * allowlist (inclui previews temporários da Vercel) e qualquer host que não
 * seja o domínio canônico de produção.
 */
export function assertOfficialBaseUrl(baseUrl: string | null | undefined): string {
  // Previews da Vercel nunca disparam campanhas oficiais, mesmo que a URL
  // configurada seja a de produção.
  if (process.env.VERCEL_ENV === "preview") {
    throw new FeedbackBaseUrlError(
      "Campanhas oficiais só podem ser disparadas no ambiente de produção.",
    );
  }

  const raw = (baseUrl ?? "").trim();
  if (!raw) {
    throw new FeedbackBaseUrlError(
      "FEEDBACK_APP_URL não configurada: campanhas oficiais exigem a URL HTTPS de produção.",
    );
  }

  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    throw new FeedbackBaseUrlError(`FEEDBACK_APP_URL inválida: ${raw}`);
  }

  if (parsed.protocol !== "https:") {
    throw new FeedbackBaseUrlError(
      "Campanhas oficiais exigem HTTPS. A URL configurada usa outro protocolo.",
    );
  }

  const host = parsed.hostname.toLowerCase();
  if (isPrivateHost(host)) {
    throw new FeedbackBaseUrlError(
      "Campanhas oficiais não podem usar localhost, loopback ou rede privada.",
    );
  }

  const allowed = allowedOfficialHosts();
  if (!allowed.includes(host)) {
    throw new FeedbackBaseUrlError(
      `Host não autorizado para campanha oficial: ${host}. Use ${allowed.join(", ")}.`,
    );
  }

  return `${parsed.protocol}//${parsed.host}`;
}

export function isOfficialBaseUrlValid(baseUrl: string | null | undefined): {
  ok: boolean;
  reason?: string;
} {
  try {
    assertOfficialBaseUrl(baseUrl);
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      reason: error instanceof Error ? error.message : "URL inválida.",
    };
  }
}

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
