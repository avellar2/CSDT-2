import { describe, expect, it } from "vitest";
import {
  buildFeedbackInviteEmail,
  buildFeedbackInviteSubject,
  escapeHtml,
  formatDeadlineLabel,
  isAuthorizedTestRecipient,
} from "@/utils/feedback/email";
import {
  FEEDBACK_DEFAULT_SUBJECT,
  FEEDBACK_TEST_RECIPIENT,
} from "@/utils/feedback/config";

const baseInput = {
  schoolLinks: [
    { schoolName: "EM Teste", url: "https://csdt.example/pesquisa/csdt/abc123" },
  ],
  baseUrl: "https://csdt.example",
};

describe("Template de e-mail do convite", () => {
  it("usa o assunto institucional definido", () => {
    expect(buildFeedbackInviteSubject({})).toBe(FEEDBACK_DEFAULT_SUBJECT);
  });

  it("marca o assunto de teste", () => {
    expect(buildFeedbackInviteSubject({ isTest: true })).toBe(
      `[TESTE] ${FEEDBACK_DEFAULT_SUBJECT}`,
    );
  });

  it("escapa HTML de qualquer entrada dinâmica", () => {
    expect(escapeHtml('<script>alert("x")</script>')).toBe(
      "&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;",
    );

    const email = buildFeedbackInviteEmail({
      ...baseInput,
      schoolLinks: [
        {
          schoolName: '<img src=x onerror="alert(1)">',
          url: "https://csdt.example/pesquisa/csdt/token?x=<script>",
        },
      ],
    });
    expect(email.html).not.toContain('<img src=x onerror="alert(1)">');
    expect(email.html).toContain("&lt;img src=x onerror=&quot;alert(1)&quot;&gt;");
    expect(email.html).not.toContain("<script>");
  });

  it("gera HTML responsivo baseado em tabelas e estilos inline", () => {
    const email = buildFeedbackInviteEmail(baseInput);
    expect(email.html).toContain("<!DOCTYPE html>");
    expect(email.html).toContain('<table role="presentation"');
    expect(email.html).toContain("background-color:#0b2a5b");
    expect(email.html).toContain("max-width:600px");
    expect(email.html).toContain("@media");
    expect(email.html).toContain("RESPONDER PESQUISA");
  });

  it("inclui versão em texto simples com link e escola", () => {
    const email = buildFeedbackInviteEmail({
      ...baseInput,
      schoolLinks: [
        { schoolName: "EM Alfa", url: "https://csdt.example/pesquisa/csdt/t1" },
      ],
    });
    expect(email.text).toContain("PESQUISA DE FEEDBACK – CSDT");
    expect(email.text).toContain("EM Alfa");
    expect(email.text).toContain("https://csdt.example/pesquisa/csdt/t1");
    expect(email.text).not.toContain("<table");
  });

  it("exibe o prazo somente quando configurado", () => {
    const withoutDeadline = buildFeedbackInviteEmail(baseInput);
    expect(withoutDeadline.html).not.toContain("Prazo para participação");

    const withDeadline = buildFeedbackInviteEmail({
      ...baseInput,
      deadlineLabel: "15/12/2026",
    });
    expect(withDeadline.html).toContain("Prazo para participação");
    expect(withDeadline.html).toContain("15/12/2026");
    expect(withDeadline.text).toContain("Prazo para participação: 15/12/2026");
  });

  it("formata prazo em America/Sao_Paulo", () => {
    expect(formatDeadlineLabel(new Date("2026-12-16T02:00:00.000Z"))).toBe("15/12/2026");
    expect(formatDeadlineLabel(null)).toBeNull();
  });

  it("quando o e-mail é compartilhado, lista um link identificado por escola", () => {
    const email = buildFeedbackInviteEmail({
      ...baseInput,
      schoolLinks: [
        { schoolName: "EM Alfa", url: "https://csdt.example/pesquisa/csdt/alfa" },
        { schoolName: "EM Alfa - Anexo", url: "https://csdt.example/pesquisa/csdt/anexo" },
      ],
    });
    expect(email.html).toContain("EM Alfa");
    expect(email.html).toContain("EM Alfa - Anexo");
    expect(email.html).toContain("pesquisa/csdt/alfa");
    expect(email.html).toContain("pesquisa/csdt/anexo");
    expect(email.html).toContain("mais de uma unidade escolar");
    expect(email.text).toContain("Cada unidade possui um link próprio");
  });

  it("marca visualmente o envio de teste sem expor dados reais", () => {
    const email = buildFeedbackInviteEmail({ ...baseInput, isTest: true });
    expect(email.subject.startsWith("[TESTE]")).toBe(true);
    expect(email.html).toContain("Envio de TESTE");
    expect(email.text).toContain("Envio de TESTE");
  });

  it("inclui o destinatário no rodapé quando informado", () => {
    const email = buildFeedbackInviteEmail({
      ...baseInput,
      recipientEmail: "escola@edu.br",
    });
    expect(email.html).toContain("escola@edu.br");
    expect(email.text).toContain("escola@edu.br");
  });

  it("não inclui anexos nem links encurtados", () => {
    const email = buildFeedbackInviteEmail(baseInput);
    expect(email.html).not.toContain("bit.ly");
    expect(email.html).not.toContain("anexo");
    expect(email.html).not.toContain("<attachment");
  });

  it("só autoriza o endereço de teste definido", () => {
    expect(isAuthorizedTestRecipient(FEEDBACK_TEST_RECIPIENT)).toBe(true);
    expect(isAuthorizedTestRecipient(`  ${FEEDBACK_TEST_RECIPIENT.toUpperCase()}  `)).toBe(
      true,
    );
    expect(isAuthorizedTestRecipient("outra.escola@edu.br")).toBe(false);
    expect(isAuthorizedTestRecipient("")).toBe(false);
  });
});
