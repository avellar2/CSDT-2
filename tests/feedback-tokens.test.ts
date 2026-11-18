import { describe, expect, it } from "vitest";
import {
  decryptFeedbackToken,
  encryptFeedbackToken,
  feedbackTokenHint,
  generateFeedbackToken,
  hashFeedbackToken,
  hashRequestMetadata,
  isPlausibleFeedbackToken,
} from "@/utils/feedback/tokens";

describe("Tokens públicos da pesquisa", () => {
  it("gera tokens aleatórios com entropia suficiente", () => {
    const tokens = new Set(Array.from({ length: 200 }, () => generateFeedbackToken()));
    expect(tokens.size).toBe(200);
    for (const token of tokens) {
      expect(token.length).toBeGreaterThanOrEqual(40);
      expect(isPlausibleFeedbackToken(token)).toBe(true);
    }
  });

  it("nunca inclui ID de escola ou campanha no token", () => {
    const token = generateFeedbackToken();
    // base64url seguro para URL, sem estrutura de IDs
    expect(token).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(token).not.toContain(".");
    expect(token).not.toContain("/");
  });

  it("produz hash SHA-256 estável e irreversível", () => {
    const token = generateFeedbackToken();
    const first = hashFeedbackToken(token);
    const second = hashFeedbackToken(token);
    expect(first).toBe(second);
    expect(first).toMatch(/^[a-f0-9]{64}$/);
    expect(first).not.toContain(token);
  });

  it("distingue tokens diferentes", () => {
    expect(hashFeedbackToken(generateFeedbackToken())).not.toBe(
      hashFeedbackToken(generateFeedbackToken()),
    );
  });

  it("rejeita tokens implausíveis", () => {
    expect(isPlausibleFeedbackToken("")).toBe(false);
    expect(isPlausibleFeedbackToken("curto")).toBe(false);
    expect(isPlausibleFeedbackToken("a".repeat(40))).toBe(true);
    expect(isPlausibleFeedbackToken("a".repeat(40) + "!" )).toBe(false);
    expect(isPlausibleFeedbackToken(12345)).toBe(false);
    expect(isPlausibleFeedbackToken(null)).toBe(false);
    expect(isPlausibleFeedbackToken("a".repeat(200))).toBe(false);
  });

  it("cifra e decifra o token para o worker de envio", () => {
    const token = generateFeedbackToken();
    const cipher = encryptFeedbackToken(token);
    expect(cipher).not.toContain(token);
    expect(cipher.startsWith("v1.")).toBe(true);
    expect(decryptFeedbackToken(cipher)).toBe(token);
  });

  it("rejeita cipher adulterado", () => {
    const cipher = encryptFeedbackToken(generateFeedbackToken());
    const parts = cipher.split(".");
    parts[3] = "AAAA" + parts[3].slice(4);
    expect(decryptFeedbackToken(parts.join("."))).toBeNull();
    expect(decryptFeedbackToken("lixo")).toBeNull();
  });

  it("expõe apenas um prefixo curto para suporte", () => {
    const token = generateFeedbackToken();
    expect(feedbackTokenHint(token)).toBe(token.slice(0, 8));
    expect(feedbackTokenHint(token)).not.toBe(token);
  });

  it("faz hash de metadados sem guardar IP bruto", () => {
    const hash = hashRequestMetadata("203.0.113.10");
    expect(hash).toMatch(/^[a-f0-9]{32}$/);
    expect(hash).not.toContain("203.0.113.10");
    expect(hashRequestMetadata(undefined)).toBeNull();
  });
});
