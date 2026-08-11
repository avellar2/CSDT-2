import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

/**
 * Teste de ISOLAMENTO/REGRESSAO.
 * Garante que Entrega e Troca NAO referenciam o template de Devolucao,
 * e que os textos dos botoes de Entrega/Troca nao mudam.
 * Inspeciona o codigo-fonte estaticamente (sem chamar a API de Devolucao).
 */
describe("Isolamento Entrega/Troca vs Devolucao", () => {
  const readSrc = (rel: string) =>
    fs.readFileSync(path.join(process.cwd(), rel), "utf8");

  it("Entrega (pdfMemorandoOneWay) referencia memorando.pdf", () => {
    const src = readSrc("src/utils/pdfMemorandoOneWay.ts");
    expect(src).toContain("memorando.pdf");
  });

  it("Entrega (pdfMemorandoOneWay) NAO referencia o template de Devolucao", () => {
    const src = readSrc("src/utils/pdfMemorandoOneWay.ts");
    expect(src).not.toContain("memorando-devolucao-csdt-template.pdf");
    expect(src).not.toContain("memorando_devolucao");
  });

  it("Troca (pdfMemorandoTroca) referencia memorando-troca2.pdf", () => {
    const src = readSrc("src/utils/pdfMemorandoTroca.ts");
    expect(src).toContain("memorando-troca2.pdf");
  });

  it("Troca (pdfMemorandoTroca) NAO referencia o template de Devolucao", () => {
    const src = readSrc("src/utils/pdfMemorandoTroca.ts");
    expect(src).not.toContain("memorando-devolucao-csdt-template.pdf");
    expect(src).not.toContain("memorando_devolucao");
  });

  it("texto do botao de Entrega permanece 'Gerar Entrega'", () => {
    const src = readSrc("src/components/Device/DeviceListMemorandumDialog.tsx");
    expect(src).toContain("Gerar Entrega");
  });

  it("texto do botao de Troca permanece 'Gerar Troca'", () => {
    const src = readSrc("src/components/Device/DeviceListMemorandumDialog.tsx");
    expect(src).toContain("Gerar Troca");
  });

  it("botao de Devolucao exibe 'Gerar Devolução'", () => {
    const src = readSrc("src/components/Device/DeviceListMemorandumDialog.tsx");
    expect(src).toContain("Gerar Devolução");
  });

  it("API antiga (generate-memorandum) bloqueia Devolucao (guard anti-duplicacao)", () => {
    const src = readSrc("src/pages/api/generate-memorandum.ts");
    expect(src).toContain("devolucao");
    expect(src).toContain("/api/generate-memorandum-devolucao");
  });

  it("hook roteia Devolucao para a API isolada; Entrega/Troca para a antiga", () => {
    const src = readSrc("src/hooks/useDeviceList.ts");
    expect(src).toContain("/api/generate-memorandum-devolucao");
    expect(src).toContain("/api/generate-memorandum");
    // Devolucao envia sourceSchoolId (ID canonico), nao confia so em schoolName
    expect(src).toContain("sourceSchoolId");
  });

  it("regenerador de Devolucao usa o novo gerador (nao o template antigo)", () => {
    const src = readSrc("src/pages/api/regenerate-memorandum-pdf.ts");
    expect(src).toContain("pdfMemorandoDevolucao");
    expect(src).toContain("fillDevolucaoPdf");
    // nao carrega o template antigo de devolucao
    expect(src).not.toContain("memorando_devolução.pdf");
  });
});