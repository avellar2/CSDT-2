import { afterEach, describe, expect, it } from "vitest";
import fs from "fs";
import path from "path";
import {
  FEEDBACK_QUEUE_BATCH_SIZE,
  FEEDBACK_TEST_RECIPIENT,
  feedbackQueueWorkerEnabled,
  feedbackSurveyPath,
} from "@/utils/feedback/config";
import { processFeedbackQueue, FeedbackServiceError } from "@/utils/feedback/service";

const readSrc = (relative: string) =>
  fs.readFileSync(path.join(process.cwd(), relative), "utf8");

describe("Segurança do envio da pesquisa", () => {
  const originalFlag = process.env.FEEDBACK_QUEUE_WORKER_ENABLED;

  afterEach(() => {
    if (originalFlag === undefined) delete process.env.FEEDBACK_QUEUE_WORKER_ENABLED;
    else process.env.FEEDBACK_QUEUE_WORKER_ENABLED = originalFlag;
  });

  it("mantém o worker desabilitado por padrão", () => {
    delete process.env.FEEDBACK_QUEUE_WORKER_ENABLED;
    expect(feedbackQueueWorkerEnabled()).toBe(false);

    process.env.FEEDBACK_QUEUE_WORKER_ENABLED = "false";
    expect(feedbackQueueWorkerEnabled()).toBe(false);

    process.env.FEEDBACK_QUEUE_WORKER_ENABLED = "true";
    expect(feedbackQueueWorkerEnabled()).toBe(true);
  });

  it("não processa nem envia nada com o worker desabilitado", async () => {
    delete process.env.FEEDBACK_QUEUE_WORKER_ENABLED;
    await expect(processFeedbackQueue({ limit: 1 })).rejects.toBeInstanceOf(
      FeedbackServiceError,
    );
    await expect(processFeedbackQueue({ limit: 1 })).rejects.toMatchObject({
      status: 503,
    });
  });

  it("processa em lotes pequenos, sem loop de longa duração", () => {
    const source = readSrc("src/utils/feedback/service.ts");
    expect(source).toContain("take: limit");
    expect(source).toContain("Math.min(");
    expect(source).toContain("FEEDBACK_QUEUE_BATCH_SIZE");
    // Não há laço while/for infinito no worker.
    expect(source).not.toMatch(/while\s*\(/);
    expect(FEEDBACK_QUEUE_BATCH_SIZE).toBeLessThanOrEqual(10);
  });

  it("reivindica cada job de forma condicional (idempotência concorrente)", () => {
    const source = readSrc("src/utils/feedback/service.ts");
    expect(source).toContain("status: \"PROCESSING\"");
    expect(source).toContain("where: { id: job.id, status: \"PENDING\" }");
    expect(source).toContain("claim.count === 0");
  });

  it("exige confirmação explícita e número de mensagens conferido", () => {
    const source = readSrc("src/pages/api/feedback/admin/campaigns/[id]/send.ts");
    expect(source).toContain("ENVIAR PESQUISA ÀS ESCOLAS");
    expect(source).toContain("body.confirm !== true");
    expect(source).toContain("body.confirmationText");
    expect(source).toContain("expectedMessages");
    expect(source).toContain("totalJobs");
  });

  it("o endpoint de teste só aceita o destinatário autorizado", () => {
    const source = readSrc("src/pages/api/feedback/admin/test-email.ts");
    expect(source).toContain("FEEDBACK_TEST_RECIPIENT");
    expect(source).toContain("isAuthorizedTestRecipient");
    expect(source).toContain("403");
    expect(FEEDBACK_TEST_RECIPIENT).toBe("vandersonavellar1997@gmail.com");
  });

  it("o worker de fila é a única via de envio em massa autorizado", () => {
    const source = readSrc("src/utils/feedback/service.ts");
    expect(source).toContain("sendMail");
    // Só o serviço de teste envia diretamente, e apenas para o endereço fixo.
    const testSendBlock = source.slice(source.indexOf("export async function sendTestEmail"));
    expect(testSendBlock).toContain("to: FEEDBACK_TEST_RECIPIENT");
  });

  it("o endpoint de fila exige worker habilitado e autorização", () => {
    const source = readSrc("src/pages/api/feedback/admin/queue.ts");
    expect(source).toContain("feedbackQueueWorkerEnabled()");
    expect(source).toContain("requireFeedbackAdmin");
    expect(source).toContain("CRON_SECRET");
  });

  it("o envio de teste cria campanha TEST isolada", () => {
    const source = readSrc("src/utils/feedback/service.ts");
    expect(source).toContain('channel: "TEST"');
    expect(source).toContain("TEST_EMAIL_SENT");
  });

  it("respostas de teste são excluídas das estatísticas oficiais por padrão", () => {
    const source = readSrc("src/utils/feedback/adminQueries.ts");
    expect(source).toContain('channel: "OFFICIAL"');
  });

  it("gera caminho público previsível e sem parâmetros de escola", () => {
    expect(feedbackSurveyPath("abc123")).toBe("/pesquisa/csdt/abc123");
    expect(feedbackSurveyPath("abc123")).not.toContain("school");
    expect(feedbackSurveyPath("abc123")).not.toContain("?");
  });

  it("não envia e-mail ao importar módulos ou em rotas de leitura", () => {
    const service = readSrc("src/utils/feedback/service.ts");
    // Nenhuma chamada de envio no topo do módulo: só dentro de funções.
    const beforeFirstExport = service.slice(0, service.indexOf("export async function logFeedbackAudit"));
    expect(beforeFirstExport).not.toContain("sendMail(");

    const preview = readSrc("src/pages/api/feedback/admin/campaigns/[id]/preview.ts");
    expect(preview).not.toContain("sendMail");

    const prepare = readSrc("src/pages/api/feedback/admin/campaigns/[id]/prepare.ts");
    expect(prepare).not.toContain("sendMail");
  });

  it("mantém o destinatário de teste fora de modelos fake de escola", () => {
    const source = readSrc("src/utils/feedback/service.ts");
    expect(source).toContain("recipientEmail: FEEDBACK_TEST_RECIPIENT");
    expect(source).not.toContain("contato@");
  });
});
