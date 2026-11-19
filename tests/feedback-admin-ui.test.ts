import { describe, expect, it } from "vitest";
import fs from "fs";
import path from "path";
import { buildResponseWhere } from "@/utils/feedback/adminQueries";

const readSrc = (relative: string) =>
  fs.readFileSync(path.join(process.cwd(), relative), "utf8");

describe("Painel da Pesquisa — contraste e superfície clara", () => {
  it("define uma superfície isolada sem alterar o tema global", () => {
    const css = readSrc("src/styles/globals.css");
    const marker = "Pesquisa de Feedback — superfície clara isolada";
    const index = css.indexOf(marker);
    expect(index).toBeGreaterThan(-1);

    const scoped = css.slice(index);
    expect(scoped).toContain(".feedback-admin-surface");
    expect(scoped).toContain("color-scheme: light");
    expect(scoped).toContain("background-color: #f8fafc");
    expect(scoped).toContain(".feedback-admin-surface input");
    // O bloco novo não deve redefinir seletores globais de body/html.
    expect(scoped).not.toMatch(/(^|\n)\s*body\s*\{/);
    expect(scoped).not.toMatch(/(^|\n)\s*html\s*\{/);
  });

  it("a página aplica a superfície e abas com contraste", () => {
    const page = readSrc("src/pages/admin/feedback.tsx");
    expect(page).toContain("feedback-admin-surface");
    expect(page).toContain("bg-[#0b2a5b] text-white");
    expect(page).toContain("text-slate-600");
    expect(page).toContain("fixed inset-0 -z-10 bg-slate-50");
  });

  it("a Visão Geral oferece ação direta para respostas de teste", () => {
    const overview = readSrc("src/components/Feedback/AdminOverview.tsx");
    expect(overview).toContain("onOpenTestResponses");
    expect(overview).toContain("Ver respostas de teste");
    expect(overview).toContain("responseCounts.test");
    expect(overview.replace(/\s+/g, " ")).toContain(
      "não entram nos indicadores oficiais",
    );

    const page = readSrc("src/pages/admin/feedback.tsx");
    expect(page).toContain('setResponsesChannel("TEST")');
  });
});

describe("Respostas de teste no painel", () => {
  it("a aba Respostas mostra testes por padrão e permite filtrar", () => {
    const component = readSrc("src/components/Feedback/AdminResponses.tsx");
    expect(component).toContain('initialChannel = "ALL"');
    expect(component).toContain("Todos os canais (oficiais e testes)");
    expect(component).toContain("Somente respostas oficiais");
    expect(component).toContain("Somente respostas de teste");
    expect(component).toContain('params.set("includeTest", "1")');
    expect(component).toContain('params.set("channel"');
  });

  it("explica que testes não entram nos indicadores oficiais", () => {
    const component = readSrc("src/components/Feedback/AdminResponses.tsx");
    expect(component).toContain("não entram");
    expect(component).toContain("indicadores oficiais");
  });

  it("tem estado vazio específico quando só existem testes", () => {
    const component = readSrc("src/components/Feedback/AdminResponses.tsx");
    expect(component).toContain("Nenhuma resposta oficial ainda");
    expect(component).toContain("Ver respostas de teste");
    expect(component).toContain("Nenhuma resposta de teste");
  });

  it("atualiza sozinha a cada 60s e ao voltar o foco", () => {
    const component = readSrc("src/components/Feedback/AdminResponses.tsx");
    expect(component).toContain("60_000");
    expect(component).toContain('window.addEventListener("focus"');
    expect(component).toContain("clearInterval");
  });

  it("a exportação usa os mesmos filtros da listagem", () => {
    const component = readSrc("src/components/Feedback/AdminResponses.tsx");
    expect(component).toContain("/api/feedback/admin/export?${buildParams(false)");
    const route = readSrc("src/pages/api/feedback/admin/export.ts");
    expect(route).toContain("req.query.channel");
    expect(route).toContain("channel,");
  });
});

describe("Filtro de canal compartilhado (lista + CSV)", () => {
  it("padrão sem parâmetros é somente OFFICIAL", () => {
    const where = buildResponseWhere({});
    expect(where.channel).toBe("OFFICIAL");
  });

  it("includeTest=1 abre todos os canais", () => {
    const where = buildResponseWhere({ includeTest: true });
    expect("channel" in where).toBe(false);
  });

  it("channel TEST tem precedência e mostra apenas testes", () => {
    const where = buildResponseWhere({ channel: "TEST", includeTest: false });
    expect(where.channel).toBe("TEST");
  });

  it("channel OFFICIAL ignora includeTest", () => {
    const where = buildResponseWhere({ channel: "OFFICIAL", includeTest: true });
    expect(where.channel).toBe("OFFICIAL");
  });

  it("respeita campanha, distrito e busca de escola", () => {
    const where = buildResponseWhere({
      channel: "TEST",
      campaignId: 2,
      district: "SEDE",
      schoolQuery: "CSDT",
    });
    expect(where).toMatchObject({
      channel: "TEST",
      campaignId: 2,
      School: { district: "SEDE", name: { contains: "CSDT" } },
    });
  });
});

describe("API de respostas", () => {
  it("aceita channel e devolve contadores por canal", () => {
    const route = readSrc("src/pages/api/feedback/admin/responses/index.ts");
    expect(route).toContain("parseChannel");
    expect(route).toContain("counts: { official: officialCount, test: testCount }");
    expect(route).toContain("channel,");
  });
});
