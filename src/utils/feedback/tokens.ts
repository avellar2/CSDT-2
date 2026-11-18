import crypto from "crypto";

/**
 * Tokens públicos da pesquisa.
 *
 * O token bruto só existe no link enviado por e-mail. O banco guarda apenas o
 * hash SHA-256, de modo que um vazamento da tabela não permite reconstruir os
 * links. O token é aleatório (32 bytes) e não carrega ID de escola/campanha:
 * a associação vem da linha de FeedbackInvite encontrada pelo hash.
 */

const TOKEN_BYTES = 32;

export function generateFeedbackToken(): string {
  return crypto.randomBytes(TOKEN_BYTES).toString("base64url");
}

export function hashFeedbackToken(token: string): string {
  return crypto.createHash("sha256").update(token, "utf8").digest("hex");
}

/** Prefixo curto, sem valor de autenticação, para suporte operacional. */
export function feedbackTokenHint(token: string): string {
  return token.slice(0, 8);
}

export function isPlausibleFeedbackToken(token: unknown): token is string {
  return (
    typeof token === "string" &&
    token.length >= 32 &&
    token.length <= 128 &&
    /^[A-Za-z0-9_-]+$/.test(token)
  );
}

/** Hash de IP/User-Agent para métricas sem armazenar dados pessoais. */
export function hashRequestMetadata(value: string | undefined): string | null {
  if (!value) return null;
  const secret = process.env.FEEDBACK_HASH_SECRET || "csdt-feedback";
  return crypto
    .createHmac("sha256", secret)
    .update(value, "utf8")
    .digest("hex")
    .slice(0, 32);
}

function encryptionKey(): Buffer {
  const secret =
    process.env.FEEDBACK_TOKEN_ENCRYPTION_KEY ||
    process.env.EMAIL_PASS ||
    process.env.DATABASE_URL ||
    "csdt-feedback-development";
  return crypto.createHash("sha256").update(secret, "utf8").digest();
}

/**
 * Cifra o token bruto (AES-256-GCM) apenas para permitir reenvio/agrupamento
 * no worker de envio. O valor é apagado do banco após o envio bem-sucedido;
 * a leitura do formulário público continua sendo feita só pelo hash.
 */
export function encryptFeedbackToken(token: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const encrypted = Buffer.concat([
    cipher.update(token, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return [
    "v1",
    iv.toString("base64url"),
    tag.toString("base64url"),
    encrypted.toString("base64url"),
  ].join(".");
}

export function decryptFeedbackToken(payload: string): string | null {
  try {
    const [version, ivPart, tagPart, dataPart] = payload.split(".");
    if (version !== "v1" || !ivPart || !tagPart || !dataPart) return null;
    const decipher = crypto.createDecipheriv(
      "aes-256-gcm",
      encryptionKey(),
      Buffer.from(ivPart, "base64url"),
    );
    decipher.setAuthTag(Buffer.from(tagPart, "base64url"));
    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(dataPart, "base64url")),
      decipher.final(),
    ]);
    return decrypted.toString("utf8");
  } catch {
    return null;
  }
}
