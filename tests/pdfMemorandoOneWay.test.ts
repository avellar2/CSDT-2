import { describe, it, expect } from "vitest";
import { PDFDocument } from "pdf-lib";
import { generateOneWayMemorandumBase64 } from "../src/utils/pdfMemorandoOneWay";

/**
 * Teste de CARACTERIZACAO (regressao) do gerador de Entrega.
 * Trava o comportamento atual ANTES de qualquer mudanca na feature Devolucao.
 * Entrega usa o template memorando.pdf (nao o de Devolucao).
 * Sem snapshot binario - so propriedades estaveis.
 */
describe("generateOneWayMemorandumBase64 (Entrega) - caracterizacao", () => {
  const sampleItems = Array.from({ length: 3 }, (_, i) => ({
    name: "Computador",
    brand: `Marca ${i + 1}`,
    serialNumber: `SN000${i + 1}`,
  }));

  it("gera base64 valida que decodifica para PDF com assinatura %PDF", async () => {
    const base64 = await generateOneWayMemorandumBase64({
      memorandumNumber: "1/2026",
      schoolName: "EM Teste",
      district: "SEDE",
      generatedBy: "Aurelio",
      operationLabel: "ENTREGA DE EQUIPAMENTOS",
      operationType: "entrega",
      date: new Date("2026-01-15T10:00:00Z"),
      items: sampleItems,
    });

    expect(typeof base64).toBe("string");
    expect(base64.length).toBeGreaterThan(0);

    const bytes = Buffer.from(base64, "base64");
    const head = bytes.slice(0, 5).toString("latin1");
    expect(head).toBe("%PDF-");
  });

  it("produz PDF com pelo menos uma pagina", async () => {
    const base64 = await generateOneWayMemorandumBase64({
      memorandumNumber: "2/2026",
      schoolName: "EM Teste",
      district: "SEDE",
      generatedBy: "Aurelio",
      operationLabel: "ENTREGA DE EQUIPAMENTOS",
      operationType: "entrega",
      date: new Date("2026-01-15T10:00:00Z"),
      items: sampleItems,
    });

    const bytes = Buffer.from(base64, "base64");
    const pdfDoc = await PDFDocument.load(bytes);
    expect(pdfDoc.getPageCount()).toBeGreaterThanOrEqual(1);
  });

  it("nao lanca com lista grande (>13 itens) - multipagina", async () => {
    const bigItems = Array.from({ length: 20 }, (_, i) => ({
      name: "Monitor",
      brand: "Marca",
      serialNumber: `SN${String(i + 1).padStart(4, "0")}`,
    }));

    const base64 = await generateOneWayMemorandumBase64({
      memorandumNumber: "3/2026",
      schoolName: "EM Teste",
      district: "SEDE",
      generatedBy: "Aurelio",
      operationLabel: "ENTREGA DE EQUIPAMENTOS",
      operationType: "entrega",
      date: new Date("2026-01-15T10:00:00Z"),
      items: bigItems,
    });

    const bytes = Buffer.from(base64, "base64");
    const pdfDoc = await PDFDocument.load(bytes);
    // 20 itens / 13 por pagina = 2 paginas
    expect(pdfDoc.getPageCount()).toBeGreaterThanOrEqual(2);
  });
});