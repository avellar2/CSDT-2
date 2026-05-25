import { NextApiRequest, NextApiResponse } from 'next';
import { PDFDocument, PDFPage, StandardFonts, rgb } from 'pdf-lib';

interface PrinterData {
  sigla: string;
  modelo: string;
  fabricante: string;
  serial: string;
  ip: string;
  setor: string;
  escola?: string;
  source?: 'monitoramento' | 'patrimonio';
}

const PAGE_WIDTH = 841.89;
const PAGE_HEIGHT = 595.28;
const MARGIN = 40;
const BOTTOM_MARGIN = 50;
const ROW_HEIGHT = 20;
const TABLE_HEADER_HEIGHT = 22;
const MAX_PRINTERS_PER_PAGE = 16;

const COL_NUM = 26;
const COL_SIGLA = 60;
const COL_MODELO = 100;
const COL_FABRICANTE = 80;
const COL_SERIAL = 100;
const COL_IP = 90;
const COL_SETOR = 80;
const COL_ESCOLA = 135;
const COL_SOURCE = 80;

const COLORS = {
  primary: rgb(0.12, 0.25, 0.69),    // #1e40af dark blue
  accent: rgb(0.18, 0.39, 0.92),      // blue accent
  headerBg: rgb(0.12, 0.25, 0.69),    // #1e40af
  darkText: rgb(0.12, 0.16, 0.22),
  gray: rgb(0.39, 0.46, 0.55),
  lightGray: rgb(0.58, 0.64, 0.72),
  white: rgb(1, 1, 1),
  rowLine: rgb(0.88, 0.91, 0.94),
  lightBg: rgb(0.97, 0.98, 1),
  statBgBlue: rgb(0.88, 0.93, 1),
  statBorderBlue: rgb(0.65, 0.78, 1),
  statBgGreen: rgb(0.88, 0.96, 0.88),
  statBorderGreen: rgb(0.65, 0.88, 0.65),
  statBgYellow: rgb(1, 0.97, 0.88),
  statBorderYellow: rgb(1, 0.88, 0.65),
  accentBar: rgb(0.18, 0.39, 0.92),
  ipColor: rgb(0.18, 0.39, 0.92),
};

// pdf-lib StandardFonts don't support accented characters
function stripAccents(str: string): string {
  return str.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/×/g, 'x').replace(/[\n\r]/g, ' ');
}

function truncateText(text: string, font: any, maxWidth: number, fontSize: number): string {
  let result = stripAccents(text);
  if (font.widthOfTextAtSize(result, fontSize) <= maxWidth) return result;
  while (result.length > 3 && font.widthOfTextAtSize(result + '...', fontSize) > maxWidth) {
    result = result.slice(0, -1);
  }
  return result + '...';
}

function getColPositions(): number[] {
  return [
    0,
    COL_NUM,
    COL_NUM + COL_SIGLA,
    COL_NUM + COL_SIGLA + COL_MODELO,
    COL_NUM + COL_SIGLA + COL_MODELO + COL_FABRICANTE,
    COL_NUM + COL_SIGLA + COL_MODELO + COL_FABRICANTE + COL_SERIAL,
    COL_NUM + COL_SIGLA + COL_MODELO + COL_FABRICANTE + COL_SERIAL + COL_IP,
    COL_NUM + COL_SIGLA + COL_MODELO + COL_FABRICANTE + COL_SERIAL + COL_IP + COL_SETOR,
    COL_NUM + COL_SIGLA + COL_MODELO + COL_FABRICANTE + COL_SERIAL + COL_IP + COL_SETOR + COL_ESCOLA,
  ];
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { printers, responsavel } = req.body as { printers: PrinterData[]; responsavel?: string };

    if (!Array.isArray(printers) || printers.length === 0) {
      return res.status(400).json({ error: 'printers must be a non-empty array' });
    }

    const responsibleName = stripAccents(responsavel && responsavel.trim() ? responsavel.trim() : 'Sistema');
    const totalPages = Math.ceil(printers.length / MAX_PRINTERS_PER_PAGE);
    const uniqueFabricantes = new Set(printers.map(p => p.fabricante)).size;
    const uniqueSetores = new Set(printers.map(p => p.setor)).size;
    const uniqueEscolas = new Set(printers.map(p => p.escola).filter(Boolean)).size;

    const pdfDoc = await PDFDocument.create();
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);

    const now = new Date();
    const dateStr = stripAccents(now.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }));
    const timeStr = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    let page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    let y = PAGE_HEIGHT - MARGIN;

    // --- PAGE 1: Full header ---
    y = drawHeader(page, fontBold, fontRegular, dateStr, responsibleName, y);
    y -= 8;
    y = drawStats(page, fontBold, fontRegular, printers.length, uniqueFabricantes, uniqueSetores, uniqueEscolas, y);
    y -= 8;
    y = drawTableHeader(page, fontBold, y);

    let printerIndex = 0;
    let currentPage = 1;

    while (printerIndex < printers.length) {
      const remaining = printers.length - printerIndex;
      const pagePrinters = printers.slice(printerIndex, printerIndex + MAX_PRINTERS_PER_PAGE);

      // Check if we need a new page
      if (printerIndex > 0) {
        page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
        y = PAGE_HEIGHT - MARGIN;
        currentPage++;

        // Mini header on overflow pages
        y = drawMiniHeader(page, fontBold, fontRegular, dateStr, responsibleName, y);
        y -= 4;
        y = drawTableHeader(page, fontBold, y);
      }

      y = drawTableRows(page, fontRegular, fontBold, pagePrinters, printerIndex, y);
      printerIndex += pagePrinters.length;

      // Draw footer on current page
      drawFooter(page, fontRegular, currentPage, totalPages, timeStr);
    }

    const pdfBytes = await pdfDoc.save();

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="controle-impressoras.pdf"');
    return res.status(200).send(Buffer.from(pdfBytes));
  } catch (error) {
    console.error('Error generating PDF:', error);
    const details = error instanceof Error ? `${error.message}\n${error.stack || ''}` : 'Unknown error';
    return res.status(500).json({
      error: 'Erro ao gerar PDF',
      details,
    });
  }
}

function drawHeader(page: PDFPage, fontBold: any, fontRegular: any, dateStr: string, responsavel: string, y: number): number {
  // Blue accent bar on left (4px wide, ~36px tall)
  page.drawRectangle({
    x: MARGIN,
    y: y - 36,
    width: 4,
    height: 36,
    color: COLORS.accentBar,
  });

  // Title
  page.drawText('Controle de Impressoras', {
    x: MARGIN + 12, y: y - 16, size: 16, font: fontBold, color: COLORS.darkText,
  });

  // Subtitle
  page.drawText('Centro de Suporte e Desenvolvimento Tecnologico', {
    x: MARGIN + 12, y: y - 28, size: 8, font: fontRegular, color: COLORS.gray,
  });

  // Date (right-aligned)
  const dateWidth = fontRegular.widthOfTextAtSize(dateStr, 8);
  page.drawText(dateStr, {
    x: PAGE_WIDTH - MARGIN - dateWidth, y: y - 16,
    size: 8, font: fontRegular, color: COLORS.darkText,
  });

  // Responsavel (right-aligned)
  const respText = `Responsavel: ${responsavel}`;
  const respWidth = fontRegular.widthOfTextAtSize(respText, 8);
  page.drawText(respText, {
    x: PAGE_WIDTH - MARGIN - respWidth, y: y - 28,
    size: 8, font: fontRegular, color: COLORS.gray,
  });

  // Full-width line below header
  const lineY = y - 38;
  page.drawLine({
    start: { x: MARGIN, y: lineY },
    end: { x: PAGE_WIDTH - MARGIN, y: lineY },
    thickness: 1.5,
    color: COLORS.accent,
  });

  return lineY - 6;
}

function drawMiniHeader(page: PDFPage, fontBold: any, fontRegular: any, dateStr: string, responsavel: string, y: number): number {
  // Compact header on overflow pages
  page.drawText('Controle de Impressoras', {
    x: MARGIN, y: y - 12, size: 12, font: fontBold, color: COLORS.darkText,
  });

  const dateWidth = fontRegular.widthOfTextAtSize(dateStr, 7);
  page.drawText(dateStr, {
    x: PAGE_WIDTH - MARGIN - dateWidth, y: y - 12,
    size: 7, font: fontRegular, color: COLORS.gray,
  });

  const lineY = y - 18;
  page.drawLine({
    start: { x: MARGIN, y: lineY },
    end: { x: PAGE_WIDTH - MARGIN, y: lineY },
    thickness: 1,
    color: COLORS.accent,
  });

  return lineY - 4;
}

function drawStats(page: PDFPage, fontBold: any, fontRegular: any, total: number, fabricantes: number, setores: number, escolas: number, y: number): number {
  const contentWidth = PAGE_WIDTH - MARGIN * 2;
  const statGap = 8;
  const statWidth = (contentWidth - statGap * 3) / 4;
  const statHeight = 36;

  const stats = [
    { num: String(total), label: 'TOTAL', bgColor: COLORS.statBgBlue, borderColor: COLORS.statBorderBlue, numColor: COLORS.accent },
    { num: String(fabricantes), label: 'FABRICANTES', bgColor: COLORS.statBgGreen, borderColor: COLORS.statBorderGreen, numColor: rgb(0.16, 0.56, 0.28) },
    { num: String(setores), label: 'SETORES', bgColor: COLORS.statBgYellow, borderColor: COLORS.statBorderYellow, numColor: rgb(0.75, 0.55, 0.05) },
    { num: String(escolas), label: 'ESCOLAS', bgColor: rgb(0.94, 0.9, 0.98), borderColor: rgb(0.8, 0.72, 0.92), numColor: rgb(0.4, 0.2, 0.6) },
  ];

  stats.forEach((stat, i) => {
    const x = MARGIN + i * (statWidth + statGap);
    page.drawRectangle({
      x, y: y - statHeight, width: statWidth, height: statHeight,
      color: stat.bgColor, borderColor: stat.borderColor, borderWidth: 0.5,
    });
    const numWidth = fontBold.widthOfTextAtSize(stat.num, 13);
    page.drawText(stat.num, {
      x: x + (statWidth - numWidth) / 2, y: y - 17,
      size: 13, font: fontBold, color: stat.numColor,
    });
    const labelWidth = fontRegular.widthOfTextAtSize(stat.label, 8);
    page.drawText(stat.label, {
      x: x + (statWidth - labelWidth) / 2, y: y - 29,
      size: 8, font: fontRegular, color: COLORS.gray,
    });
  });

  return y - statHeight;
}

function drawTableHeader(page: PDFPage, fontBold: any, y: number): number {
  const contentWidth = PAGE_WIDTH - MARGIN * 2;
  page.drawRectangle({
    x: MARGIN, y: y - TABLE_HEADER_HEIGHT,
    width: contentWidth, height: TABLE_HEADER_HEIGHT,
    color: COLORS.headerBg,
  });

  const colPositions = getColPositions();
  const headers = ['#', 'Sigla', 'Modelo', 'Fabricante', 'Serial', 'IP', 'Setor', 'Escola', 'Fonte'];

  headers.forEach((header, i) => {
    page.drawText(header, {
      x: MARGIN + colPositions[i] + 4, y: y - TABLE_HEADER_HEIGHT + 6,
      size: 8, font: fontBold, color: COLORS.white,
    });
  });

  return y - TABLE_HEADER_HEIGHT;
}

function drawTableRows(page: PDFPage, fontRegular: any, fontBold: any, printers: PrinterData[], startIndex: number, y: number): number {
  const contentWidth = PAGE_WIDTH - MARGIN * 2;
  const colPositions = getColPositions();
  const colWidths = [COL_NUM, COL_SIGLA, COL_MODELO, COL_FABRICANTE, COL_SERIAL, COL_IP, COL_SETOR, COL_ESCOLA, COL_SOURCE];
  const fontSize = 8;

  printers.forEach((printer, idx) => {
    const globalIdx = startIndex + idx;
    const rowY = y - (idx + 1) * ROW_HEIGHT;

    // Check if we need a new page
    if (rowY < BOTTOM_MARGIN) {
      // This case shouldn't happen if we properly paginate, but guard against it
      return;
    }

    // Alternating row background
    if (globalIdx % 2 === 0) {
      page.drawRectangle({
        x: MARGIN, y: rowY, width: contentWidth, height: ROW_HEIGHT,
        color: COLORS.lightBg,
      });
    }

    // Row number
    const numText = String(globalIdx + 1);
    const numWidth = fontRegular.widthOfTextAtSize(numText, fontSize);
    page.drawText(numText, {
      x: MARGIN + colPositions[0] + (COL_NUM - numWidth) / 2, y: rowY + 6,
      size: fontSize, font: fontRegular, color: COLORS.gray,
    });

    // Sigla
    const siglaText = truncateText(printer.sigla || '', fontRegular, colWidths[1] - 8, fontSize);
    page.drawText(siglaText, {
      x: MARGIN + colPositions[1] + 4, y: rowY + 6,
      size: fontSize, font: fontBold, color: COLORS.darkText,
    });

    // Modelo
    const modeloText = truncateText(printer.modelo || '', fontRegular, colWidths[2] - 8, fontSize);
    page.drawText(modeloText, {
      x: MARGIN + colPositions[2] + 4, y: rowY + 6,
      size: fontSize, font: fontRegular, color: COLORS.darkText,
    });

    // Fabricante
    const fabricanteText = truncateText(printer.fabricante || '', fontRegular, colWidths[3] - 8, fontSize);
    page.drawText(fabricanteText, {
      x: MARGIN + colPositions[3] + 4, y: rowY + 6,
      size: fontSize, font: fontRegular, color: COLORS.darkText,
    });

    // Serial
    const serialText = truncateText(printer.serial || '', fontRegular, colWidths[4] - 8, fontSize);
    page.drawText(serialText, {
      x: MARGIN + colPositions[4] + 4, y: rowY + 6,
      size: fontSize, font: fontRegular, color: COLORS.darkText,
    });

    // IP (in blue accent color)
    const ipText = truncateText(printer.ip || '', fontRegular, colWidths[5] - 8, fontSize);
    page.drawText(ipText, {
      x: MARGIN + colPositions[5] + 4, y: rowY + 6,
      size: fontSize, font: fontRegular, color: COLORS.ipColor,
    });

    // Setor
    const setorText = truncateText(printer.setor || '', fontRegular, colWidths[6] - 8, fontSize);
    page.drawText(setorText, {
      x: MARGIN + colPositions[6] + 4, y: rowY + 6,
      size: fontSize, font: fontRegular, color: COLORS.gray,
    });

    // Escola
    const escolaText = truncateText(printer.escola || '-', fontRegular, colWidths[7] - 8, fontSize);
    page.drawText(escolaText, {
      x: MARGIN + colPositions[7] + 4, y: rowY + 6,
      size: fontSize, font: fontRegular, color: COLORS.gray,
    });

    // Fonte
    const sourceText = printer.source === 'patrimonio' ? 'Patrimonio' : 'SNMP';
    const srcText = truncateText(sourceText, fontRegular, colWidths[8] - 8, fontSize);
    page.drawText(srcText, {
      x: MARGIN + colPositions[8] + 4, y: rowY + 6,
      size: fontSize, font: fontRegular, color: COLORS.accent,
    });

    // Row bottom border
    page.drawLine({
      start: { x: MARGIN, y: rowY },
      end: { x: MARGIN + contentWidth, y: rowY },
      thickness: 0.3,
      color: COLORS.rowLine,
    });
  });

  return y - printers.length * ROW_HEIGHT;
}

function drawFooter(page: PDFPage, fontRegular: any, pageNum: number, totalPages: number, timeStr: string): void {
  const footerY = 20;

  // Separator line
  page.drawLine({
    start: { x: MARGIN, y: footerY + 12 },
    end: { x: PAGE_WIDTH - MARGIN, y: footerY + 12 },
    thickness: 0.5,
    color: COLORS.rowLine,
  });

  // System name (left)
  page.drawText(stripAccents('Sistema CSDT - Controle de Impressoras'), {
    x: MARGIN, y: footerY, size: 7, font: fontRegular, color: COLORS.lightGray,
  });

  // Page number (right)
  const pageText = `Pag ${pageNum} de ${totalPages}`;
  const pageWidth = fontRegular.widthOfTextAtSize(pageText, 7);
  page.drawText(pageText, {
    x: PAGE_WIDTH - MARGIN - pageWidth, y: footerY, size: 7, font: fontRegular, color: COLORS.lightGray,
  });

  // Generation timestamp (right, above page number is not needed since footer is single line)
  // Actually put it before the page text
  const genText = `Gerado em ${timeStr}`;
  const genWidth = fontRegular.widthOfTextAtSize(genText, 7);
  page.drawText(genText, {
    x: PAGE_WIDTH - MARGIN - genWidth, y: footerY + 14, size: 7, font: fontRegular, color: COLORS.lightGray,
  });
}