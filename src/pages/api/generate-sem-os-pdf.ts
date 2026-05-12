import { NextApiRequest, NextApiResponse } from 'next';
import { getPendingDailyDemandItems } from '@/utils/pendingDailyDemandOs';
import { formatBrazilDateKey } from '@/utils/dailyDemandOsRules';
import { chromium } from 'playwright';

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

    // Group by date
    const byDate = new Map<string, PendingDailyDemandItem[]>();
    for (const item of previousDemands) {
      const arr = byDate.get(item.demandDate) || [];
      arr.push(item);
      byDate.set(item.demandDate, arr);
    }
    const sortedDates = Array.from(byDate.keys()).sort().reverse();
    const dateEntries = Array.from(byDate.entries());

    const html = buildHTML(dateEntries, sortedDates);

    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle' });

    const pdfBuffer = await page.pdf({
      format: 'A4',
      landscape: true,
      margin: { top: '15mm', right: '10mm', bottom: '12mm', left: '10mm' },
      printBackground: true,
      displayHeaderFooter: true,
      headerTemplate: `
        <div style="width: 100%; text-align: center; font-size: 8px; color: #94a3b8; font-family: system-ui, sans-serif;">
          CSDT — Coordenadoria de Suporte e Desenvolvimento Tecnológico · <span class="pageNumber"></span> de <span class="totalPages"></span>
        </div>
      `,
      footerTemplate: '<div></div>',
    });

    await browser.close();

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="demandas-sem-os.pdf"');
    return res.status(200).send(pdfBuffer);
  } catch (error) {
    console.error('Error generating PDF:', error);
    return res.status(500).json({
      error: 'Erro ao gerar PDF',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

function formatDate(dateStr: string) {
  const dateObj = new Date(`${dateStr}T12:00:00-03:00`);
  return dateObj.toLocaleDateString('pt-BR');
}

function buildHTML(data: [string, PendingDailyDemandItem[]][], dates: string[]) {
  const totalDemands = data.reduce((acc, [, items]) => acc + items.length, 0);
  const allTechs = data.flatMap(([, items]) => items.flatMap(i => i.responsibleTechnicians));
  const uniqueTechs = [...new Set(allTechs)];

  const todayStr = formatDate(new Date().toISOString().split('T')[0]);

  const rows = data.map(([dateKey, items]) => {
    const firstTechs = items[0]?.responsibleTechnicians.join(', ') || '';
    const formatted = formatDate(dateKey);

    const rowsHtml = items.map(item => `
      <tr>
        <td class="col-id">${item.demandId}</td>
        <td class="col-school">${item.schoolName}</td>
        <td class="col-district">${item.schoolDistrict}º</td>
        <td class="col-desc">${item.description}</td>
      </tr>
    `).join('');

    return `
      <div class="section">
        <div class="sec-header">
          <span class="sec-badge">${formatted}</span>
          <span class="sec-info">${items.length} demanda${items.length > 1 ? 's' : ''} · Técnicos: ${firstTechs}</span>
        </div>
        <table>
          <thead>
            <tr><th style="width:36px">ID</th><th style="width:260px">Escola</th><th style="width:42px">Dist.</th><th>Descrição</th></tr>
          </thead>
          <tbody>${rowsHtml}</tbody>
        </table>
      </div>
    `;
  }).join('');

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<style>
@page { size: A4 landscape; margin: 12mm 10mm 12mm 10mm; }
* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: system-ui, -apple-system, 'Segoe UI', sans-serif; font-size: 9px; color: #1f2937; background: #fff; line-height: 1.5; overflow: visible; }
.topbar { display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 3px solid #2563eb; padding-bottom: 10px; margin-bottom: 12px; break-inside: avoid; page-break-inside: avoid; }
.brand h1 { font-size: 20px; font-weight: 800; color: #0f172a; }
.brand p { font-size: 10px; color: #64748b; margin-top: 2px; }
.meta { text-align: right; }
.meta .date { font-size: 13px; font-weight: 700; color: #1e3a5f; }
.meta .org { font-size: 9px; color: #94a3b8; }
.stats { display: flex; gap: 10px; margin-bottom: 14px; break-inside: avoid; page-break-inside: avoid; }
.stat { flex: 1; background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%); border-radius: 6px; padding: 8px 10px; text-align: center; border: 1px solid #bfdbfe; }
.stat .num { font-size: 17px; font-weight: 800; color: #2563eb; line-height: 1; }
.stat .lbl { font-size: 8px; color: #64748b; text-transform: uppercase; letter-spacing: 0.6px; margin-top: 3px; }
tbody { break-inside: avoid; page-break-inside: avoid; }
tbody tr { break-inside: avoid; page-break-inside: avoid; }
.section { margin-bottom: 10px; break-inside: avoid; page-break-inside: avoid; break-before: avoid; page-break-before: avoid; orphans: 4; widows: 4; }
.sec-header { display: flex; align-items: center; gap: 10px; margin-bottom: 5px; }
.sec-badge { background: #2563eb; color: #fff; font-size: 10px; font-weight: 700; padding: 3px 10px; border-radius: 4px; }
.sec-info { font-size: 9px; color: #64748b; }
table { width: 100%; border-collapse: separate; border-spacing: 0; border-radius: 6px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.06); break-inside: avoid; page-break-inside: avoid; }
thead { break-after: avoid; page-break-after: avoid; }
thead th { background: #1e3a5f; color: #fff; font-size: 8.5px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; padding: 6px 8px; text-align: left; border: none; }
tbody td { padding: 5px 8px; border-bottom: 1px solid #e2e8f0; font-size: 9px; vertical-align: top; }
tbody tr:nth-child(odd) td { background: #f8fafc; }
tbody tr:last-child td { border-bottom: none; }
.col-id { font-family: ui-monospace, monospace; font-weight: 700; color: #2563eb; font-size: 10px; width: 36px; text-align: center; }
.col-school { font-weight: 700; color: #1e3a5f; background: #dbeafe !important; border-radius: 3px; }
.col-district { font-weight: 600; color: #475569; width: 42px; text-align: center; }
.col-desc { color: #475569; line-height: 1.4; }
.footer { margin-top: 10px; text-align: center; font-size: 8px; color: #94a3b8; padding-top: 6px; border-top: 1px solid #e2e8f0; }
</style>
</head>
<body>
<div class="topbar">
  <div class="brand">
    <h1>Demandas Sem OS Criada</h1>
    <p>Relatório de Pendências — Dias Anteriores</p>
  </div>
  <div class="meta">
    <div class="date">${todayStr}</div>
    <div class="org">CSDT — Coordenadoria de Suporte e Desenvolvimento Tecnológico</div>
  </div>
</div>

<div class="stats">
  <div class="stat"><div class="num">${totalDemands}</div><div class="lbl">Demandas</div></div>
  <div class="stat"><div class="num">${dates.length}</div><div class="lbl">Datas</div></div>
  <div class="stat"><div class="num">${uniqueTechs.length}</div><div class="lbl">Técnicos</div></div>
</div>

${rows}

<div class="footer">Relatório gerado pelo sistema CSDT-2 · ${totalDemands} demandas sem OS criada · ${todayStr}</div>
</body>
</html>`;
}
