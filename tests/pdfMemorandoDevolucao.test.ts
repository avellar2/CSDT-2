import { describe, it, expect } from "vitest";
import { PDFDocument } from "pdf-lib";
import crypto from "crypto";
import fs from "fs";
import path from "path";
import {
  loadDevolucaoTemplateBytes,
  fillDevolucaoPdf,
  fillDevolucaoPageFields,
  removeFieldBorders,
  validateDevolucaoFields,
  REQUIRED_FIELDS,
  DEVOLUCAO_ITEMS_PER_PAGE,
} from "../src/utils/pdfMemorandoDevolucao";

const TEMPLATE_PATH = path.join(
  process.cwd(),
  "public",
  "memorando-devolucao-csdt-template.pdf",
);

const sampleData = (count: number) => ({
  memorandumNumber: "7/2026",
  senderName: "EM Teste Devolução",
  date: new Date("2026-08-03T10:00:00Z"),
  items: Array.from({ length: count }, (_, i) => ({
    name: "Nobreak",
    brand: "NOBREAK 600 DS-UPS600-Q",
    serialNumber: `3018104${String(i + 1).padStart(4, "0")}`,
  })),
});

describe("pdfMemorandoDevolucao - template e campos", () => {
  it("usa somente memorando-devolucao-csdt-template.pdf e NAO carrega o template antigo", async () => {
    const src = fs.readFileSync(
      path.join(process.cwd(), "src/utils/pdfMemorandoDevolucao.ts"),
      "utf8",
    );
    expect(src).toContain("memorando-devolucao-csdt-template.pdf");
    // Nao usa o template antigo como caminho de carregamento
    expect(src).not.toContain("public/memorando_devolução.pdf");
    expect(src).not.toContain("public/memorando_devolucao.pdf");
    // Nao carrega memorando.pdf (entrega) nem memorando-troca2.pdf (troca)
    expect(src).not.toContain("public/memorando.pdf");
    expect(src).not.toContain("public/memorando-troca2.pdf");
  });

  it("os 6 campos AcroForm existem no template", async () => {
    const bytes = loadDevolucaoTemplateBytes();
    const pdfDoc = await PDFDocument.load(bytes);
    const form = pdfDoc.getForm();
    expect(() => validateDevolucaoFields(form)).not.toThrow();
    for (const name of REQUIRED_FIELDS) {
      expect(() => form.getTextField(name as string)).not.toThrow();
    }
  });
});

describe("pdfMemorandoDevolucao - bordas dos widgets", () => {
  it("removeFieldBorders zera a largura da borda de todos os widgets", async () => {
    const bytes = loadDevolucaoTemplateBytes();
    const pdfDoc = await PDFDocument.load(bytes);
    const form = pdfDoc.getForm();

    removeFieldBorders(form);

    for (const field of form.getFields()) {
      const widgets = field.acroField.getWidgets();
      for (const widget of widgets) {
        const bs = widget.getBorderStyle();
        // getOrCreateBorderStyle().setWidth(0) foi chamado -> width 0
        expect(bs?.getWidth() ?? 0).toBe(0);
      }
    }
  });

  it("NAO promete remover bordas gravadas na arte (so widgets)", () => {
    // Este teste documenta a limitacao: removeFieldBorders atua apenas nos
    // widgets AcroForm. Bordas da folha/brasao pertencem ao template.
    const src = fs.readFileSync(
      path.join(process.cwd(), "src/utils/pdfMemorandoDevolucao.ts"),
      "utf8",
    );
    expect(src).toContain("NAO remove bordas");
  });
});

describe("pdfMemorandoDevolucao - preenchimento", () => {
  it("preenche numero, data, remetente, destinatario, assunto e equipamentos sem undefined/null", async () => {
    const bytes = loadDevolucaoTemplateBytes();
    const pdfDoc = await PDFDocument.load(bytes);
    const form = pdfDoc.getForm();

    fillDevolucaoPageFields(form, sampleData(2), 0);

    expect(form.getTextField("memo_numero").getText()).toBe("7/2026");
    expect(form.getTextField("remetente").getText()).toBe("EM Teste Devolução");
    expect(form.getTextField("destinatario").getText()).toBe(
      "Coordenadoria de Suporte e Desenvolvimento Tecnológico. CSDT/SME.",
    );
    expect(form.getTextField("assunto").getText()).toBe(
      "Devolução de equipamentos de informática",
    );

    const equip = form.getTextField("equipamentos").getText();
    expect(equip).toContain("1. ");
    expect(equip).toContain("30181040001");
    expect(equip).not.toContain("undefined");
    expect(equip).not.toContain("null");

    // Nenhum campo preenchido com undefined/null
    for (const name of REQUIRED_FIELDS) {
      const v = form.getTextField(name as string).getText();
      expect(v).not.toContain("undefined");
      expect(v).not.toContain("null");
    }
  });

  it("assunto da pagina de continuacao tem sufixo '— continuação'", async () => {
    const bytes = loadDevolucaoTemplateBytes();
    const pdfDoc = await PDFDocument.load(bytes);
    const form = pdfDoc.getForm();
    fillDevolucaoPageFields(form, sampleData(30), 1);
    expect(form.getTextField("assunto").getText()).toBe(
      "Devolução de equipamentos de informática — continuação",
    );
  });

  it("numeracao dos equipamentos continua globalmente entre paginas", async () => {
    const bytes = loadDevolucaoTemplateBytes();
    const pdfDoc = await PDFDocument.load(bytes);
    const form = pdfDoc.getForm();
    fillDevolucaoPageFields(form, sampleData(30), 1);
    const equip = form.getTextField("equipamentos").getText();
    // pagina 2 comeca no item 26
    expect(equip.startsWith("26. ")).toBe(true);
  });
});

describe("pdfMemorandoDevolucao - pipeline final", () => {
  it("gera PDF valido com assinatura %PDF e >=1 pagina", async () => {
    const bytes = loadDevolucaoTemplateBytes();
    const result = await fillDevolucaoPdf(bytes, sampleData(3));
    expect(typeof result.pdfBase64).toBe("string");
    expect(result.pageCount).toBeGreaterThanOrEqual(1);

    const out = Buffer.from(result.pdfBase64, "base64");
    expect(out.slice(0, 5).toString("latin1")).toBe("%PDF-");

    const pdfDoc = await PDFDocument.load(out);
    expect(pdfDoc.getPageCount()).toBeGreaterThanOrEqual(1);
  });

  it("usa StandardFonts.Helvetica e form.updateFieldAppearances", () => {
    const src = fs.readFileSync(
      path.join(process.cwd(), "src/utils/pdfMemorandoDevolucao.ts"),
      "utf8",
    );
    expect(src).toContain("StandardFonts.Helvetica");
    expect(src).toContain("updateFieldAppearances");
  });

  it("cria paginas de continuacao sem duplicar a primeira pagina", async () => {
    const bytes = loadDevolucaoTemplateBytes();
    // 30 itens / 25 por pagina = 2 paginas
    const result = await fillDevolucaoPdf(bytes, sampleData(30));
    expect(result.pageCount).toBe(2);
    expect(result.pageCount).toBe(
      Math.ceil(30 / DEVOLUCAO_ITEMS_PER_PAGE),
    );
  });

  it("template original em /public permanece inalterado (hash antes/depois)", async () => {
    const hashBefore = crypto
      .createHash("sha256")
      .update(fs.readFileSync(TEMPLATE_PATH))
      .digest("hex");

    await fillDevolucaoPdf(loadDevolucaoTemplateBytes(), sampleData(5));

    const hashAfter = crypto
      .createHash("sha256")
      .update(fs.readFileSync(TEMPLATE_PATH))
      .digest("hex");

    expect(hashAfter).toBe(hashBefore);
  });
});