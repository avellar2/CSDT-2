import {
  PDFDocument,
  StandardFonts,
  PDFForm,
  PDFFont,
  PDFName,
} from "pdf-lib";
import fs from "fs";
import path from "path";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { buildItemDisplayName } from "./itemDisplayName";

/**
 * Gerador de PDF de DEVOLUCAO isolado.
 *
 * Usa EXCLUSIVAMENTE o template:
 *   public/memorando-devolucao-csdt-template.pdf
 *
 * Nao referencia memorando_devolucao.pdf (antigo e inexistente) nem os
 * templates de Entrega (memorando.pdf) ou Troca (memorando-troca2.pdf).
 * Os geradores antigos (pdfMemorandoOneWay/pdfMemorandoTroca) nao sao
 * alterados.
 */

export const DEVOLUCAO_TEMPLATE_PUBLIC_URL =
  "/memorando-devolucao-csdt-template.pdf";
export const DEVOLUCAO_FIELDS_PUBLIC_URL =
  "/memorando-devolucao-csdt-fields.json";

const DEVOLUCAO_TEMPLATE_FILENAME = "memorando-devolucao-csdt-template.pdf";

export const REQUIRED_FIELDS = [
  "memo_numero",
  "data_documento",
  "remetente",
  "destinatario",
  "assunto",
  "equipamentos",
] as const;

/** Capacidade estimada do campo multiline `equipamentos` por pagina. */
export const DEVOLUCAO_ITEMS_PER_PAGE = 25;

const DESTINATARIO =
  "Coordenadoria de Suporte e Desenvolvimento Tecnológico. CSDT/SME.";
const ASSUNTO_PRIMEIRA = "Devolução de equipamentos de informática";
const ASSUNTO_CONTINUACAO =
  "Devolução de equipamentos de informática — continuação";

export interface DevolucaoPdfItem {
  name: string;
  brand: string;
  serialNumber: string;
}

export interface DevolucaoPdfData {
  memorandumNumber: string;
  /** Nome da escola de origem (sourceSchool.name do banco, nunca do frontend). */
  senderName: string;
  date: Date;
  items: DevolucaoPdfItem[];
}

export interface DevolucaoPdfResult {
  pdfBase64: string;
  pageCount: number;
}

/**
 * Le os bytes do template em /public (caminho seguro via process.cwd()).
 * Valida existencia. Nao escreve de volta; nao cria arquivo temporario.
 */
export function loadDevolucaoTemplateBytes(): Buffer {
  const pdfPath = path.join(
    process.cwd(),
    "public",
    DEVOLUCAO_TEMPLATE_FILENAME,
  );
  if (!fs.existsSync(pdfPath)) {
    throw new Error(
      `Template de Devolucao nao encontrado: ${DEVOLUCAO_TEMPLATE_FILENAME}`,
    );
  }
  return fs.readFileSync(pdfPath);
}

/**
 * Valida que todos os campos AcroForm obrigatorios existem no template.
 * Interrompe SOMENTE a Devolucao com mensagem clara listando os faltantes.
 */
export function validateDevolucaoFields(form: PDFForm): void {
  const missing: string[] = [];
  for (const name of REQUIRED_FIELDS) {
    try {
      const field = form.getField(name as string);
      if (!field) missing.push(name as string);
    } catch {
      missing.push(name as string);
    }
  }
  if (missing.length > 0) {
    throw new Error(
      `Template de Devolucao sem campos obrigatorios: ${missing.join(", ")}`,
    );
  }
}

/**
 * Remove bordas/fundos SOMENTE dos widgets AcroForm:
 *  - border width -> 0 (/BS /W = 0)
 *  - remove border color (/BC) e background (/BG) do /MK
 *
 * NAO remove bordas, sombras ou fundos gravados na ARTE da pagina
 * (borda externa da folha, moldura do brasao) - esses pertencem ao template
 * e devem ser corrigidos no proprio arquivo PDF. Nao edita/cobre/redesenha
 * o brasao.
 */
export function removeFieldBorders(form: PDFForm): void {
  for (const field of form.getFields()) {
    const widgets = field.acroField.getWidgets();
    for (const widget of widgets) {
      // Forca largura de borda 0
      widget.getOrCreateBorderStyle().setWidth(0);
      // Remove cor de borda e fundo do /MK (se existir)
      const mk = widget.getAppearanceCharacteristics();
      if (mk) {
        mk.dict.delete(PDFName.of("BC"));
        mk.dict.delete(PDFName.of("BG"));
      }
    }
  }
}

/**
 * Preenche os campos de UMA pagina do memorando de Devolucao.
 * Exportado para teste (permite inspecionar valores sem flatten).
 *
 * pageIndex 0 -> primeira pagina (assunto normal); >0 -> continuação.
 * A numeracao dos equipamentos continua globalmente entre paginas.
 */
export function fillDevolucaoPageFields(
  form: PDFForm,
  data: DevolucaoPdfData,
  pageIndex: number,
): void {
  validateDevolucaoFields(form);

  const totalPages = Math.max(
    1,
    Math.ceil(data.items.length / DEVOLUCAO_ITEMS_PER_PAGE),
  );
  const startIdx = pageIndex * DEVOLUCAO_ITEMS_PER_PAGE;
  const endIdx = Math.min(startIdx + DEVOLUCAO_ITEMS_PER_PAGE, data.items.length);
  const slice = data.items.slice(startIdx, endIdx);
  const startNumber = startIdx + 1;

  const formattedDate = format(data.date, "dd 'de' MMMM 'de' yyyy", {
    locale: ptBR,
  });

  const assunto =
    pageIndex === 0 ? ASSUNTO_PRIMEIRA : ASSUNTO_CONTINUACAO;

  const equipamentosText = slice
    .map((item, i) => {
      const display = buildItemDisplayName(item.name, item.brand);
      const serial = item.serialNumber || "SEM SERIAL";
      return `${startNumber + i}. ${display} — ${serial}`;
    })
    .join("\n");

  form.getTextField("memo_numero").setText(data.memorandumNumber);
  form.getTextField("data_documento").setText(formattedDate);
  form.getTextField("remetente").setText(data.senderName);
  form.getTextField("destinatario").setText(DESTINATARIO);
  form.getTextField("assunto").setText(assunto);
  form.getTextField("equipamentos").setText(equipamentosText);

  // Marca de continuacao (apenas informativo, se houver mais de uma pagina)
  if (totalPages > 1) {
    // sem campo dedicado; a numeracao global + assunto ja indicam continuacao
  }
}

/**
 * Gera o PDF final de Devolucao (multi-pagina, sem duplicar a primeira pagina).
 *
 * - Cria um PDFDocument de saida vazio.
 * - Para cada fatia de DEVOLUCAO_ITEMS_PER_PAGE itens:
 *     * carrega NOVA instancia do template (nao reutiliza entre paginas/retries);
 *     * remove bordas dos widgets;
 *     * preenche os campos daquela pagina (numeracao global);
 *     * updateFieldAppearances(font) com StandardFonts.Helvetica;
 *     * flatten (so na copia; template original nunca alterado);
 *     * copia exatamente a pagina preenchida para o PDF de saida.
 * - pageCount = outputPdf.getPageCount().
 *
 * O template original em /public nunca e alterado.
 */
export async function fillDevolucaoPdf(
  templateBytes: Buffer,
  data: DevolucaoPdfData,
): Promise<DevolucaoPdfResult> {
  const outputPdf = await PDFDocument.create();
  const totalPages = Math.max(
    1,
    Math.ceil(data.items.length / DEVOLUCAO_ITEMS_PER_PAGE),
  );

  for (let pageIndex = 0; pageIndex < totalPages; pageIndex++) {
    // Nova instancia do template a cada pagina
    const pageDoc = await PDFDocument.load(templateBytes);
    const form = pageDoc.getForm();

    const font = await pageDoc.embedFont(StandardFonts.Helvetica);

    // Preenche, remove bordas, regenera aparencia, flatten
    fillDevolucaoPageFields(form, data, pageIndex);
    removeFieldBorders(form);
    form.updateFieldAppearances(font);
    form.flatten();

    // Copia exatamente a pagina preenchida para o PDF de saida
    const [copiedPage] = await outputPdf.copyPages(pageDoc, [0]);
    outputPdf.addPage(copiedPage);
  }

  const pageCount = outputPdf.getPageCount();
  const pdfBytes = await outputPdf.save();

  return {
    pdfBase64: Buffer.from(pdfBytes).toString("base64"),
    pageCount,
  };
}