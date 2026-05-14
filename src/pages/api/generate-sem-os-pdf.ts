import { NextApiRequest, NextApiResponse } from 'next';
import { getPendingDailyDemandItems } from '@/utils/pendingDailyDemandOs';
import { formatBrazilDateKey } from '@/utils/dailyDemandOsRules';
import { PDFDocument, PDFPage, StandardFonts, rgb } from 'pdf-lib';

interface PendingDailyDemandItem {
  demandId: number;
  schoolName: string;
  schoolAddress: string;
  schoolDistrict: string;
  description: string;
  createdAt: string;
  demandDate: string;
  visitStatus: string | null;
  visitReason: string | null;
  responsibleTechnicians: string[];
}

const PAGE_WIDTH = 841.89;
const PAGE_HEIGHT = 595.28;
const MARGIN = 40;
const STATS_HEIGHT = 40;
const SECTION_HEADER_HEIGHT = 22;
const TABLE_HEADER_HEIGHT = 18;
const ROW_HEIGHT = 16;
const BOTTOM_MARGIN = 30;

const COL_ID = 36;
const COL_SCHOOL = 260;
const COL_DISTRICT = 42;

const COLORS = {
  primary: rgb(0.15, 0.23, 0.37),
  accent: rgb(0.15, 0.39, 0.92),
  lightBg: rgb(0.97, 0.98, 1),
  headerBg: rgb(0.12, 0.23, 0.37),
  statBg: rgb(0.94, 0.97, 1),
  statBorder: rgb(0.75, 0.87, 1),
  gray: rgb(0.39, 0.46, 0.55),
  lightGray: rgb(0.58, 0.64, 0.72),
  darkText: rgb(0.12, 0.16, 0.22),
  descText: rgb(0.28, 0.33, 0.41),
  white: rgb(1, 1, 1),
  rowLine: rgb(0.88, 0.91, 0.94),
};

// pdf-lib StandardFonts don't support accented characters — strip them
function stripAccents(str: string): string {
  return str.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/×/g, 'x').replace(/[\n\r]/g, ' ');
}

function formatDatePt(dateStr: string): string {
  const dateObj = new Date(`${dateStr}T12:00:00-03:00`);
  return stripAccents(dateObj.toLocaleDateString('pt-BR'));
}

function getColPositions(): number[] {
  const contentWidth = PAGE_WIDTH - MARGIN * 2;
  return [0, COL_ID, COL_ID + COL_SCHOOL, COL_ID + COL_SCHOOL + COL_DISTRICT];
}

function getColDesc(): number {
  return PAGE_WIDTH - MARGIN * 2 - COL_ID - COL_SCHOOL - COL_DISTRICT;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const items = await getPendingDailyDemandItems();
    const todayKey = formatBrazilDateKey(new Date());

    const previousDemands = items.filter(
      (d: PendingDailyDemandItem) =>
        d.visitStatus !== 'NOT_VISITED' && d.demandDate < todayKey
    );

    if (previousDemands.length === 0) {
      return res.status(200).json({ success: true, data: [], message: 'Nenhuma demanda pendente encontrada.' });
    }

    const byDate = new Map<string, PendingDailyDemandItem[]>();
    for (const item of previousDemands) {
      const arr = byDate.get(item.demandDate) || [];
      arr.push(item);
      byDate.set(item.demandDate, arr);
    }
    const sortedDates = Array.from(byDate.keys()).sort().reverse();

    const totalDemands = previousDemands.length;
    const allTechs = previousDemands.flatMap(i => i.responsibleTechnicians);
    const uniqueTechs = Array.from(new Set(allTechs));

    const pdfDoc = await PDFDocument.create();
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const todayStr = formatDatePt(new Date().toISOString().split('T')[0]);

    const sections: { dateKey: string; items: PendingDailyDemandItem[]; formatted: string; techs: string }[] = [];
    for (const dateKey of sortedDates) {
      const dateItems = byDate.get(dateKey) || [];
      sections.push({
        dateKey,
        items: dateItems,
        formatted: formatDatePt(dateKey),
        techs: stripAccents(dateItems[0]?.responsibleTechnicians.join(', ') || ''),
      });
    }

    let page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    let y = PAGE_HEIGHT - MARGIN;

    y = drawHeader(page, fontBold, fontRegular, todayStr, y);
    y -= 8;
    y = drawStats(page, fontBold, fontRegular, totalDemands, sortedDates.length, uniqueTechs.length, y);
    y -= 8;

    for (const section of sections) {
      const sectionHeight = SECTION_HEADER_HEIGHT + TABLE_HEADER_HEIGHT + section.items.length * ROW_HEIGHT;

      if (y - sectionHeight < BOTTOM_MARGIN) {
        page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
        y = PAGE_HEIGHT - MARGIN;
        y = drawMiniHeader(page, fontBold, fontRegular, todayStr, y);
        y -= 8;
      }

      y = drawSectionHeader(page, fontBold, fontRegular, section, y);
      y = drawTableHeader(page, fontBold, y);
      y = drawTableRows(page, fontRegular, section.items, y);
      y -= 6;
    }

    const footerText = `Relatorio gerado pelo sistema CSDT-2 · ${totalDemands} demandas sem OS criada · ${todayStr}`;
    const footerWidth = fontRegular.widthOfTextAtSize(footerText, 7);
    page.drawText(footerText, {
      x: (PAGE_WIDTH - footerWidth) / 2,
      y: 15,
      size: 7,
      font: fontRegular,
      color: COLORS.lightGray,
    });

    const pdfBytes = await pdfDoc.save();

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="demandas-sem-os.pdf"');
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

function drawHeader(page: PDFPage, fontBold: any, fontRegular: any, todayStr: string, y: number): number {
  page.drawText('Demandas Sem OS Criada', {
    x: MARGIN, y: y - 16, size: 18, font: fontBold, color: COLORS.darkText,
  });
  page.drawText('Relatorio de Pendencias — Dias Anteriores', {
    x: MARGIN, y: y - 30, size: 9, font: fontRegular, color: COLORS.gray,
  });

  const dateWidth = fontBold.widthOfTextAtSize(todayStr, 12);
  page.drawText(todayStr, {
    x: PAGE_WIDTH - MARGIN - dateWidth, y: y - 16,
    size: 12, font: fontBold, color: COLORS.primary,
  });
  const csdtWidth = fontRegular.widthOfTextAtSize('CSDT', 8);
  page.drawText('CSDT', {
    x: PAGE_WIDTH - MARGIN - csdtWidth, y: y - 28,
    size: 8, font: fontRegular, color: COLORS.lightGray,
  });

  const lineY = y - 38;
  page.drawLine({
    start: { x: MARGIN, y: lineY },
    end: { x: PAGE_WIDTH - MARGIN, y: lineY },
    thickness: 2.5,
    color: COLORS.accent,
  });

  return lineY - 8;
}

function drawMiniHeader(page: PDFPage, fontBold: any, fontRegular: any, todayStr: string, y: number): number {
  page.drawText('Demandas Sem OS Criada', {
    x: MARGIN, y: y - 14, size: 13, font: fontBold, color: COLORS.darkText,
  });
  const dateWidth = fontBold.widthOfTextAtSize(todayStr, 9);
  page.drawText(todayStr, {
    x: PAGE_WIDTH - MARGIN - dateWidth, y: y - 14,
    size: 9, font: fontBold, color: COLORS.primary,
  });

  const lineY = y - 20;
  page.drawLine({
    start: { x: MARGIN, y: lineY },
    end: { x: PAGE_WIDTH - MARGIN, y: lineY },
    thickness: 1.5,
    color: COLORS.accent,
  });

  return lineY - 6;
}

function drawStats(page: PDFPage, fontBold: any, fontRegular: any, totalDemands: number, dateCount: number, techCount: number, y: number): number {
  const contentWidth = PAGE_WIDTH - MARGIN * 2;
  const statWidth = contentWidth / 3 - 6;
  const stats = [
    { num: String(totalDemands), label: 'Demandas' },
    { num: String(dateCount), label: 'Datas' },
    { num: String(techCount), label: 'Tecnicos' },
  ];

  stats.forEach((stat, i) => {
    const x = MARGIN + i * (statWidth + 8);
    page.drawRectangle({
      x, y: y - STATS_HEIGHT, width: statWidth, height: STATS_HEIGHT,
      color: COLORS.statBg, borderColor: COLORS.statBorder, borderWidth: 0.5,
    });
    const numWidth = fontBold.widthOfTextAtSize(stat.num, 15);
    page.drawText(stat.num, {
      x: x + (statWidth - numWidth) / 2, y: y - 22,
      size: 15, font: fontBold, color: COLORS.accent,
    });
    const labelWidth = fontRegular.widthOfTextAtSize(stat.label.toUpperCase(), 7);
    page.drawText(stat.label.toUpperCase(), {
      x: x + (statWidth - labelWidth) / 2, y: y - 34,
      size: 7, font: fontRegular, color: COLORS.gray,
    });
  });

  return y - STATS_HEIGHT;
}

function drawSectionHeader(page: PDFPage, fontBold: any, fontRegular: any, section: { formatted: string; items: PendingDailyDemandItem[]; techs: string }, y: number): number {
  const badgeText = section.formatted;
  const badgeWidth = fontBold.widthOfTextAtSize(badgeText, 9) + 16;
  const badgeHeight = 16;

  page.drawRectangle({
    x: MARGIN, y: y - badgeHeight, width: badgeWidth, height: badgeHeight,
    color: COLORS.accent,
  });
  page.drawText(badgeText, {
    x: MARGIN + 8, y: y - badgeHeight + 4,
    size: 9, font: fontBold, color: COLORS.white,
  });

  const infoText = `${section.items.length} demanda${section.items.length > 1 ? 's' : ''} · Tecnicos: ${section.techs}`;
  page.drawText(infoText, {
    x: MARGIN + badgeWidth + 8, y: y - badgeHeight + 4,
    size: 9, font: fontRegular, color: COLORS.gray,
  });

  return y - badgeHeight - 4;
}

function drawTableHeader(page: PDFPage, fontBold: any, y: number): number {
  const contentWidth = PAGE_WIDTH - MARGIN * 2;
  page.drawRectangle({
    x: MARGIN, y: y - TABLE_HEADER_HEIGHT,
    width: contentWidth, height: TABLE_HEADER_HEIGHT,
    color: COLORS.headerBg,
  });

  const colPositions = getColPositions();
  const headers = ['ID', 'Escola', 'Dist.', 'Descricao'];
  headers.forEach((header, i) => {
    page.drawText(header, {
      x: MARGIN + colPositions[i] + 6, y: y - TABLE_HEADER_HEIGHT + 5,
      size: 7.5, font: fontBold, color: COLORS.white,
    });
  });

  return y - TABLE_HEADER_HEIGHT;
}

function drawTableRows(page: PDFPage, fontRegular: any, items: PendingDailyDemandItem[], y: number): number {
  const contentWidth = PAGE_WIDTH - MARGIN * 2;
  const colPositions = getColPositions();
  const maxSchoolWidth = COL_SCHOOL - 10;
  const maxDescWidth = getColDesc() - 10;

  items.forEach((item, idx) => {
    const rowY = y - (idx + 1) * ROW_HEIGHT;

    if (idx % 2 === 0) {
      page.drawRectangle({
        x: MARGIN, y: rowY, width: contentWidth, height: ROW_HEIGHT,
        color: COLORS.lightBg,
      });
    }

    // ID
    const idText = String(item.demandId);
    const idWidth = fontRegular.widthOfTextAtSize(idText, 8.5);
    page.drawText(idText, {
      x: MARGIN + colPositions[0] + (COL_ID - idWidth) / 2,
      y: rowY + 4, size: 8.5, font: fontRegular, color: COLORS.accent,
    });

    // School (truncate, strip accents)
    let schoolText = stripAccents(item.schoolName);
    while (fontRegular.widthOfTextAtSize(schoolText, 8.5) > maxSchoolWidth && schoolText.length > 3) {
      schoolText = schoolText.slice(0, -4) + '...';
    }
    page.drawText(schoolText, {
      x: MARGIN + colPositions[1] + 6, y: rowY + 4,
      size: 8.5, font: fontRegular, color: COLORS.primary,
    });

    // District
    const distText = `${item.schoolDistrict}o`;
    page.drawText(distText, {
      x: MARGIN + colPositions[2] + 8, y: rowY + 4,
      size: 8.5, font: fontRegular, color: COLORS.descText,
    });

    // Description (truncate, strip accents)
    let descText = stripAccents(item.description || '');
    while (fontRegular.widthOfTextAtSize(descText, 8.5) > maxDescWidth && descText.length > 3) {
      descText = descText.slice(0, -4) + '...';
    }
    page.drawText(descText, {
      x: MARGIN + colPositions[3] + 6, y: rowY + 4,
      size: 8.5, font: fontRegular, color: COLORS.descText,
    });

    // Row separator
    page.drawLine({
      start: { x: MARGIN, y: rowY },
      end: { x: MARGIN + contentWidth, y: rowY },
      thickness: 0.3,
      color: COLORS.rowLine,
    });
  });

  return y - items.length * ROW_HEIGHT;
}