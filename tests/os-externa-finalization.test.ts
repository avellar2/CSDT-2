import { describe, expect, it } from "vitest";
import {
  deriveOsExternaFinalization,
  isValidConfirmationToken,
  normalizePhotoUrls,
} from "@/utils/osExternaFinalization";

/**
 * Incidente 25/11/2026:
 * - 651/2026: 8 referências vazias de foto, sem token, sem lastEmailSent.
 * - 652/2026: 2 URLs, token existente, sem lastEmailSent.
 * - 653/2026: 5 URLs, token existente, sem lastEmailSent.
 */
describe("deriveOsExternaFinalization", () => {
  it("não conta strings vazias como foto enviada (OS 651/2026)", () => {
    const derived = deriveOsExternaFinalization({
      status: "Pendente",
      fotosAntes: ["", "", "", ""],
      fotosDepois: ["", "", "", ""],
      assinado: null,
      lastEmailSent: null,
    });

    expect(derived.totalFotos).toBe(0);
    expect(derived.stage).toBe("fotos");
    expect(derived.isPendingFinalization).toBe(true);
  });

  it("classifica token presente e e-mail ausente como e-mail pendente (652/653)", () => {
    const derived = deriveOsExternaFinalization({
      status: "Pendente",
      fotosAntes: ["https://res.cloudinary.com/a.jpg", "https://res.cloudinary.com/b.jpg"],
      fotosDepois: [],
      assinado: "token-existente-123456",
      lastEmailSent: null,
      solucionado: "Sim",
    });

    expect(derived.totalFotos).toBe(2);
    expect(derived.hasToken).toBe(true);
    expect(derived.emailSent).toBe(false);
    expect(derived.stage).toBe("email");
    expect(derived.isPendingFinalization).toBe(true);
  });

  it("após o e-mail, problema não solucionado fica aguardando chamado", () => {
    const derived = deriveOsExternaFinalization({
      status: "Pendente",
      fotosAntes: ["https://res.cloudinary.com/a.jpg"],
      assinado: "token-existente-123456",
      lastEmailSent: "2026-11-26T12:00:00.000Z",
      solucionado: "Nao",
    });

    expect(derived.stage).toBe("chamado");
    expect(derived.isPendingFinalization).toBe(true);
  });

  it("não cobra chamado quando ele já foi criado", () => {
    const derived = deriveOsExternaFinalization(
      {
        status: "Pendente",
        fotosAntes: ["https://res.cloudinary.com/a.jpg"],
        assinado: "token-existente-123456",
        lastEmailSent: "2026-11-26T12:00:00.000Z",
        solucionado: "Nao",
      },
      { hasChamadoReagendamento: true }
    );

    expect(derived.stage).toBe("aguardando-assinatura");
    expect(derived.isPendingFinalization).toBe(false);
  });

  it("reconhece a etapa 'pdf' registrada no banco como pendência técnica", () => {
    const derived = deriveOsExternaFinalization(
      {
        status: "Pendente",
        fotosAntes: ["https://res.cloudinary.com/a.jpg"],
        assinado: "token-existente-123456",
        lastEmailSent: null,
      },
      { storedStage: "pdf" }
    );

    expect(derived.stage).toBe("pdf");
    expect(derived.label).toContain("PDF");
    expect(derived.isPendingFinalization).toBe(true);
  });

  it("etapa registrada no banco tem prioridade (fotos legitimamente ausentes)", () => {
    const derived = deriveOsExternaFinalization(
      {
        status: "Pendente",
        fotosAntes: [],
        assinado: null,
        lastEmailSent: null,
      },
      { storedStage: "aguardando-assinatura" }
    );

    expect(derived.stage).toBe("aguardando-assinatura");
    expect(derived.isPendingFinalization).toBe(false);
  });

  it("separação entre finalização técnica e assinatura da escola", () => {
    expect(
      deriveOsExternaFinalization({ status: "Assinado" }).stage
    ).toBe("assinada");
    expect(
      deriveOsExternaFinalization({
        status: "Pendente",
        motivoRecusa: "Dados divergentes",
      }).stage
    ).toBe("recusada");
    expect(
      deriveOsExternaFinalization({
        status: "Pendente",
        fotosAntes: ["https://x/a.jpg"],
        assinado: "token-existente-123456",
        lastEmailSent: "2026-11-26T12:00:00.000Z",
        solucionado: "Sim",
      }).stage
    ).toBe("aguardando-assinatura");
  });
});

describe("helpers de fotos e token", () => {
  it("normaliza URLs removendo vazias e duplicadas", () => {
    expect(
      normalizePhotoUrls(["a", "", "a", "  ", null, 1, "b"])
    ).toEqual(["a", "b"]);
  });

  it("token só é válido com tamanho mínimo (não confunde nome assinado)", () => {
    expect(isValidConfirmationToken("Ana")).toBe(false);
    expect(isValidConfirmationToken("token-1234567890")).toBe(true);
  });
});
