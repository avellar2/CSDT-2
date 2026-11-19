import { afterEach, describe, expect, it } from "vitest";
import fs from "fs";
import path from "path";
import {
  FEEDBACK_INSTITUTIONAL_CONTACT,
  FEEDBACK_OFFICIAL_CC,
  FEEDBACK_QUEUE_BATCH_SIZE,
  assertOfficialBaseUrl,
  isOfficialBaseUrlValid,
} from "@/utils/feedback/config";
import { analyzeMailAcceptance, normalizeMailbox } from "@/utils/feedback/service";
import { buildFeedbackInviteEmail } from "@/utils/feedback/email";

const readSrc = (relative: string) =>
  fs.readFileSync(path.join(process.cwd(), relative), "utf8");

describe("CC institucional e aceitação por destinatário", () => {
  it("usa o contato institucional fixo no CC e no Reply-To", () => {
    expect(FEEDBACK_INSTITUTIONAL_CONTACT).toBe(
      "csdt@smeduquedecaxias.rj.gov.br",
    );
    expect(FEEDBACK_OFFICIAL_CC).toBe(FEEDBACK_INSTITUTIONAL_CONTACT);
  });

  it("considera enviado apenas quando a escola está em accepted", () => {
    const accepted = analyzeMailAcceptance({
      primary: "escola@edu.br",
      cc: FEEDBACK_OFFICIAL_CC,
      accepted: ["escola@edu.br", FEEDBACK_OFFICIAL_CC],
      rejected: [],
    });
    expect(accepted).toMatchObject({
      primaryAccepted: true,
      ccAccepted: true,
      ccStatus: "ACCEPTED",
      ccError: null,
    });
  });

  it("detecta rejeição do CC sem impedir o envio à escola", () => {
    const result = analyzeMailAcceptance({
      primary: "escola@edu.br",
      cc: FEEDBACK_OFFICIAL_CC,
      accepted: ["escola@edu.br"],
      rejected: [FEEDBACK_OFFICIAL_CC],
    });
    expect(result.primaryAccepted).toBe(true);
    expect(result.ccStatus).toBe("REJECTED");
    expect(result.ccError).toContain("rejeitou");
  });

  it("não considera enviado quando só o CSDT foi aceito", () => {
    const result = analyzeMailAcceptance({
      primary: "escola@edu.br",
      cc: FEEDBACK_OFFICIAL_CC,
      accepted: [FEEDBACK_OFFICIAL_CC],
      rejected: ["escola@edu.br"],
    });
    expect(result.primaryAccepted).toBe(false);
    expect(result.ccAccepted).toBe(true);
    expect(result.ccStatus).toBe("ACCEPTED");
  });

  it("normaliza endereços com display name", () => {
    expect(normalizeMailbox('"Escola X" <Escola@EDU.br>')).toBe("escola@edu.br");
    expect(normalizeMailbox(" CSDT <csdt@smeduquedecaxias.rj.gov.br> ")).toBe(
      "csdt@smeduquedecaxias.rj.gov.br",
    );
  });

  it("sem CC, registra NOT_CONFIGURED", () => {
    expect(
      analyzeMailAcceptance({
        primary: "escola@edu.br",
        accepted: ["escola@edu.br"],
        rejected: [],
      }).ccStatus,
    ).toBe("NOT_CONFIGURED");
  });

  it("o serviço envia CC e Reply-To institucionais e checa o destinatário principal", () => {
    const source = readSrc("src/utils/feedback/service.ts");
    expect(source).toContain("cc: FEEDBACK_OFFICIAL_CC");
    expect(source).toContain("replyTo: FEEDBACK_INSTITUTIONAL_CONTACT");
    expect(source).toContain("analyzeMailAcceptance");
    expect(source).toContain("acceptance.primaryAccepted");
    expect(source).toContain("retryWithoutCc");
    expect(source).toContain('ccStatus: acceptance.ccStatus');
    // A lógica antiga (qualquer aceite) não pode voltar.
    expect(source).not.toContain("const accepted = sendResult.accepted.length > 0");
  });

  it("o template usa o contato institucional em HTML e texto", () => {
    const email = buildFeedbackInviteEmail({
      schoolLinks: [
        { schoolName: "EM Teste", url: "https://csdt.vercel.app/pesquisa/csdt/x" },
      ],
      baseUrl: "https://csdt.vercel.app",
    });
    expect(email.html).toContain(
      "mailto:csdt@smeduquedecaxias.rj.gov.br",
    );
    expect(email.html).toContain("Contato:");
    expect(email.text).toContain(
      "Contato: csdt@smeduquedecaxias.rj.gov.br",
    );
  });

  it("não altera o serviço dos demais módulos quando não há CC", () => {
    const mailer = readSrc("src/utils/mailer.ts");
    expect(mailer).toContain("cc?: string");
    expect(mailer).toContain("cc: message.cc");
  });
});

describe("URL canônica das campanhas oficiais", () => {
  const originalHosts = process.env.FEEDBACK_ALLOWED_HOSTS;
  const originalVercelEnv = process.env.VERCEL_ENV;

  afterEach(() => {
    if (originalHosts === undefined) delete process.env.FEEDBACK_ALLOWED_HOSTS;
    else process.env.FEEDBACK_ALLOWED_HOSTS = originalHosts;
    if (originalVercelEnv === undefined) delete process.env.VERCEL_ENV;
    else process.env.VERCEL_ENV = originalVercelEnv;
  });

  it("aceita a URL HTTPS canônica de produção", () => {
    expect(assertOfficialBaseUrl("https://csdt.vercel.app")).toBe(
      "https://csdt.vercel.app",
    );
    expect(isOfficialBaseUrlValid("https://csdt.vercel.app").ok).toBe(true);
  });

  it("bloqueia localhost, loopback e rede privada", () => {
    for (const url of [
      "http://localhost:3000",
      "https://localhost:3000",
      "https://127.0.0.1",
      "https://192.168.0.10",
      "https://10.0.0.5",
    ]) {
      expect(isOfficialBaseUrlValid(url).ok, url).toBe(false);
    }
  });

  it("bloqueia HTTP, URL vazia e domínio incorreto", () => {
    expect(isOfficialBaseUrlValid("http://csdt.vercel.app").ok).toBe(false);
    expect(isOfficialBaseUrlValid("").ok).toBe(false);
    expect(isOfficialBaseUrlValid(null).ok).toBe(false);
    expect(isOfficialBaseUrlValid("https://outro-dominio.com").ok).toBe(false);
  });

  it("bloqueia preview temporário da Vercel", () => {
    expect(
      isOfficialBaseUrlValid(
        "https://csdt-abc123-vandersons-projects-6b7a3afd.vercel.app",
      ).ok,
    ).toBe(false);
  });

  it("bloqueia campanha oficial em ambiente de Preview", () => {
    process.env.VERCEL_ENV = "preview";
    expect(isOfficialBaseUrlValid("https://csdt.vercel.app").ok).toBe(false);
    process.env.VERCEL_ENV = "production";
    expect(isOfficialBaseUrlValid("https://csdt.vercel.app").ok).toBe(true);
  });

  it("permite host extra explicitamente configurado", () => {
    process.env.FEEDBACK_ALLOWED_HOSTS = "csdt.vercel.app,feedback.smedu.rj.gov.br";
    expect(
      assertOfficialBaseUrl("https://feedback.smedu.rj.gov.br"),
    ).toBe("https://feedback.smedu.rj.gov.br");
  });

  it("preparação, autorização e fila revalidam a URL", () => {
    const source = readSrc("src/utils/feedback/service.ts");
    const prepare = source.slice(source.indexOf("export async function prepareCampaign"));
    expect(prepare).toContain("assertOfficialUrlForCampaign");
    const authorize = source.slice(
      source.indexOf("export async function authorizeCampaignSend"),
    );
    expect(authorize).toContain("assertOfficialUrlForCampaign");
    const queue = source.slice(
      source.indexOf("export async function processFeedbackQueue"),
    );
    expect(queue).toContain("assertOfficialUrlForCampaign");
  });
});

describe("Fila e limites para o plano Hobby", () => {
  it("processa lotes pequenos", () => {
    expect(FEEDBACK_QUEUE_BATCH_SIZE).toBeLessThanOrEqual(5);
    const source = readSrc("src/utils/feedback/service.ts");
    expect(source).toContain("Math.max(options?.limit ?? FEEDBACK_QUEUE_BATCH_SIZE, 1)");
  });

  it("não depende de cron sub-diário no vercel.json", () => {
    const vercel = JSON.parse(readSrc("vercel.json")) as {
      crons?: Array<{ path: string; schedule: string }>;
    };
    const crons = vercel.crons ?? [];
    expect(crons.some((cron) => cron.path.includes("feedback"))).toBe(false);
    // Hobby: apenas crons diários.
    for (const cron of crons) {
      expect(cron.schedule).toMatch(/^\d+ \d+ \* \* \*$/);
    }
  });

  it("o processamento assistido existe e não inicia sozinho", () => {
    const ui = readSrc("src/components/Feedback/AdminCampaigns.tsx");
    expect(ui).toContain("Processar automaticamente");
    expect(ui).toContain("useState(false)");
    expect(ui).toContain("visibilitychange");
    expect(ui).toContain("60_000");
  });
});
