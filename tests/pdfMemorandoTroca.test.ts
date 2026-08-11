import { describe, it, expect } from "vitest";
import { PDFDocument } from "pdf-lib";
import { generateMemorandoTrocaBase64 } from "../src/utils/pdfMemorandoTroca";

/**
 * Teste de CARACTERIZACAO (regressao) do gerador de Troca.
 * Trava o comportamento atual. Troca usa o template memorando-troca2.pdf
 * (nao o de Devolucao). Sem snapshot binario.
 */
describe("generateMemorandoTrocaBase64 (Troca) - caracterizacao", () => {
  const outgoing = [
    { name: "Computador", brand: "Marca A", serialNumber: "SN001" },
    { name: "Notebook", brand: "Marca B", serialNumber: "SN002" },
  ];
  const incoming = [
    { name: "Impressora", brand: "Marca C", serialNumber: "SN003" },
  ];

  it("gera base64 valida com assinatura %PDF", async () => {
    const base64 = await generateMemorandoTrocaBase64({
      memorandumNumber: "5/2026",
      fromSchool: "CSDT",
      toSchool: "EM Destino",
      fromDistrict: "SEDE",
      toDistrict: "DISTRITO 1",
      outgoingEquipment: outgoing,
      incomingEquipment: incoming,
      date: new Date("2026-02-10T10:00:00Z"),
    });

    expect(typeof base64).toBe("string");
    expect(base64.length).toBeGreaterThan(0);

    const bytes = Buffer.from(base64, "base64");
    const head = bytes.slice(0, 5).toString("latin1");
    expect(head).toBe("%PDF-");
  });

  it("produz PDF com pelo menos uma pagina", async () => {
    const base64 = await generateMemorandoTrocaBase64({
      memorandumNumber: "6/2026",
      fromSchool: "CSDT",
      toSchool: "EM Destino",
      fromDistrict: "SEDE",
      toDistrict: "DISTRITO 1",
      outgoingEquipment: outgoing,
      incomingEquipment: incoming,
      date: new Date("2026-02-10T10:00:00Z"),
    });

    const bytes = Buffer.from(base64, "base64");
    const pdfDoc = await PDFDocument.load(bytes);
    expect(pdfDoc.getPageCount()).toBeGreaterThanOrEqual(1);
  });
});