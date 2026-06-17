# Controle de Impressoras — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create a dedicated page for viewing, filtering, editing, and exporting printer data as a professional PDF.

**Architecture:** Card on Dashboard navigates to `/controle-impressoras`. Page fetches printers from `GET /api/printers`, lets users filter/select/edit inline, then POSTs selected data to `GET /api/generate-printer-control-pdf` which generates a professional PDF using pdf-lib. Toggle between table and card views.

**Tech Stack:** Next.js Pages Router, React, Tailwind CSS, pdf-lib, Lucide React icons

---

## File Structure

| File | Action | Responsibility |
|------|--------|---------------|
| `src/pages/controle-impressoras.tsx` | Create | Main page component with table/card views, filters, selection, inline editing, PDF generation trigger |
| `src/pages/api/generate-printer-control-pdf.ts` | Create | API route that receives printer data and generates a professional PDF using pdf-lib |
| `src/components/Dashboard.tsx` | Modify | Add "Controle de Impressoras" card to allCards array |
| `src/components/Header.tsx` | Modify | Add "Controle de Impressoras" navigation item |

---

### Task 1: Add Dashboard Card

**Files:**
- Modify: `src/components/Dashboard.tsx`

- [ ] **Step 1: Add PrinterCheck import to Dashboard.tsx**

In `src/components/Dashboard.tsx`, add `PrinterCheck` to the lucide-react import statement at the top of the file. The current import is around lines 2-27. Add `PrinterCheck` alongside the other icon imports.

- [ ] **Step 2: Add the card to the allCards array**

Find the section of `allCards` where cards with category `'Escolas e Equipamentos'` are defined (around lines 300-350). Add this card after the existing printer-related cards:

```tsx
{
  id: 'controle-impressoras',
  title: 'Controle de Impressoras',
  icon: PrinterCheck,
  color: 'bg-indigo-500 hover:bg-indigo-700',
  path: '/controle-impressoras',
  roles: ['ADMTOTAL', 'ADMIN'],
  category: 'Escolas e Equipamentos',
  badge: null
}
```

- [ ] **Step 3: Add the card id to cardCategories**

In the `cardCategories` object, find the `'Escolas e Equipamentos'` key and add `'controle-impressoras'` to its array:

```tsx
'Escolas e Equipamentos': ['schools', 'items', 'device-list', 'printers', 'controle-impressoras', 'locados', 'schools-map'],
```

- [ ] **Step 4: Verify the card appears**

Run the dev server and navigate to `/dashboard`. Verify that the "Controle de Impressoras" card appears in the "Escolas e Equipamentos" section for ADMTOTAL/ADMIN users. The card should be indigo colored with the PrinterCheck icon. Clicking it should attempt to navigate to `/controle-impressoras` (which will 404 until we create the page).

- [ ] **Step 5: Commit**

```bash
git add src/components/Dashboard.tsx
git commit -m "feat: adicionar card Controle de Impressoras no dashboard"
```

---

### Task 2: Add Header Navigation Item

**Files:**
- Modify: `src/components/Header.tsx`

- [ ] **Step 1: Add PrinterCheck import to Header.tsx**

In `src/components/Header.tsx`, add `PrinterCheck` to the lucide-react import.

- [ ] **Step 2: Add navigation item to Header's allCards array**

Find the Header's `allCards` array. Add this entry in the appropriate section (after other printer/equipment items):

```tsx
{
  id: 'controle-impressoras',
  title: 'Controle de Impressoras',
  icon: PrinterCheck,
  path: '/controle-impressoras',
  roles: ['ADMTOTAL', 'ADMIN'],
  category: 'Escolas e Equipamentos'
}
```

- [ ] **Step 3: Verify the header navigation item appears**

Open the header sidebar. Confirm that "Controle de Impressoras" appears for ADMTOTAL/ADMIN users.

- [ ] **Step 4: Commit**

```bash
git add src/components/Header.tsx
git commit -m "feat: adicionar item Controle de Impressoras no header"
```

---

### Task 3: Create the PDF Generation API

**Files:**
- Create: `src/pages/api/generate-printer-control-pdf.ts`

This is the backend first so the page can call it once built.

- [ ] **Step 1: Create the API route file**

Create `src/pages/api/generate-printer-control-pdf.ts` with the following content. This follows the exact pattern from `generate-sem-os-pdf.ts` (programmatic pdf-lib, landscape A4, drawing functions that return cursor positions):

```ts
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import type { NextApiRequest, NextApiResponse } from 'next';

// Page dimensions (landscape A4)
const PAGE_WIDTH = 841.89;
const PAGE_HEIGHT = 595.28;
const MARGIN = 40;

// Layout constants
const ROW_HEIGHT = 20;
const TABLE_HEADER_HEIGHT = 24;
const STATS_ROW_HEIGHT = 36;
const BOTTOM_MARGIN = 50;

const COLORS = {
  primary: rgb(0.15, 0.23, 0.37),
  accent: rgb(0.15, 0.39, 0.92),
  headerBgStart: rgb(0.12, 0.25, 0.69),
  headerBgEnd: rgb(0.23, 0.51, 0.96),
  lightBg: rgb(0.97, 0.98, 1),
  white: rgb(1, 1, 1),
  black: rgb(0, 0, 0),
  gray: rgb(0.4, 0.4, 0.4),
  lightGray: rgb(0.94, 0.95, 0.97),
  borderColor: rgb(0.89, 0.91, 0.94),
  statsBlue: rgb(0.91, 0.95, 1),
  statsGreen: rgb(0.94, 0.99, 0.94),
  statsYellow: rgb(1, 0.99, 0.92),
};

// Column widths for the printer table
const COL_NUM = 30;
const COL_SIGLA = 70;
const COL_MODELO = 120;
const COL_FABRICANTE = 100;
const COL_SERIAL = 130;
const COL_IP = 110;
const COL_SETOR = 141.89; // fills remaining width

function stripAccents(str: string): string {
  return str.normalize('NFD').replace(/[̀-ͯ]/g, '');
}

function truncateText(text: string, font: any, maxWidth: number): string {
  const stripped = stripAccents(text);
  let measured = font.widthOfTextAtSize(stripped, 8);
  if (measured <= maxWidth) return stripped;
  let truncated = stripped;
  while (truncated.length > 0 && font.widthOfTextAtSize(truncated + '...', 8) > maxWidth) {
    truncated = truncated.slice(0, -1);
  }
  return truncated + '...';
}

interface PrinterData {
  sigla: string;
  modelo: string;
  fabricante: string;
  serial: string;
  ip: string;
  setor: string;
}

function drawHeader(
  page: any, fontBold: any, fontRegular: any, dateStr: string, responsavel: string, y: number
): number {
  // Blue accent line
  page.drawRectangle({ x: MARGIN, y: y + 5, width: 4, height: 40, color: COLORS.accent });

  // Title
  page.drawText(stripAccents('Controle de Impressoras'), {
    x: MARGIN + 12, y: y + 30, size: 16, font: fontBold, color: COLORS.primary
  });

  // Subtitle
  page.drawText(stripAccents('Centro de Suporte e Desenvolvimento Tecnologico'), {
    x: MARGIN + 12, y: y + 14, size: 8, font: fontRegular, color: COLORS.gray
  });

  // Date and responsible (right side)
  const dateWidth = fontRegular.widthOfTextAtSize(stripAccents(dateStr), 8);
  page.drawText(stripAccents(dateStr), {
    x: PAGE_WIDTH - MARGIN - dateWidth, y: y + 30, size: 8, font: fontRegular, color: COLORS.gray
  });

  const respText = stripAccents('Responsavel: ' + responsavel);
  const respWidth = fontRegular.widthOfTextAtSize(respText, 8);
  page.drawText(respText, {
    x: PAGE_WIDTH - MARGIN - respWidth, y: y + 16, size: 8, font: fontRegular, color: COLORS.gray
  });

  // Separator line
  y -= 10;
  page.drawLine({
    start: { x: MARGIN, y: y },
    end: { x: PAGE_WIDTH - MARGIN, y: y },
    thickness: 2, color: COLORS.accent
  });

  return y - 10;
}

function drawMiniHeader(page: any, fontBold: any, fontRegular: any, dateStr: string, y: number): number {
  page.drawRectangle({ x: MARGIN, y: y + 5, width: 4, height: 22, color: COLORS.accent });
  page.drawText(stripAccents('Controle de Impressoras'), {
    x: MARGIN + 12, y: y + 14, size: 11, font: fontBold, color: COLORS.primary
  });
  const dateWidth = fontRegular.widthOfTextAtSize(stripAccents(dateStr), 7);
  page.drawText(stripAccents(dateStr), {
    x: PAGE_WIDTH - MARGIN - dateWidth, y: y + 16, size: 7, font: fontRegular, color: COLORS.gray
  });
  y -= 6;
  page.drawLine({
    start: { x: MARGIN, y: y }, end: { x: PAGE_WIDTH - MARGIN, y: y },
    thickness: 1.5, color: COLORS.accent
  });
  return y - 8;
}

function drawStats(
  page: any, fontBold: any, fontRegular: any,
  total: number, fabricantes: number, setores: number, y: number
): number {
  const boxWidth = 160;
  const boxHeight = 30;
  const gap = 14;
  const totalWidth = boxWidth * 3 + gap * 2;
  const startX = MARGIN + (PAGE_WIDTH - 2 * MARGIN - totalWidth) / 2;

  const stats = [
    { label: 'Total', value: String(total), bg: COLORS.statsBlue, color: COLORS.accent },
    { label: 'Fabricantes', value: String(fabricantes), bg: COLORS.statsGreen, color: rgb(0.13, 0.55, 0.13) },
    { label: 'Setores', value: String(setores), bg: COLORS.statsYellow, color: rgb(0.75, 0.55, 0.04) },
  ];

  stats.forEach((stat, i) => {
    const x = startX + i * (boxWidth + gap);
    page.drawRectangle({ x, y: y - boxHeight, width: boxWidth, height: boxHeight, color: stat.bg, borderRadius: 4 });
    page.drawText(stripAccents(stat.label), { x: x + 10, y: y - 10, size: 8, font: fontRegular, color: COLORS.gray });
    page.drawText(stat.value, { x: x + 10, y: y - 24, size: 13, font: fontBold, color: stat.color });
  });

  return y - boxHeight - 14;
}

function drawTableHeader(page: any, fontBold: any, y: number): number {
  const x = MARGIN;
  const width = PAGE_WIDTH - 2 * MARGIN;

  // Gradient background (simulated with a solid dark blue)
  page.drawRectangle({
    x, y: y - TABLE_HEADER_HEIGHT, width, height: TABLE_HEADER_HEIGHT,
    color: COLORS.headerBgStart
  });

  let colX = x + 6;
  const headers = ['#', 'Sigla', 'Modelo', 'Fabricante', 'Serial', 'IP', 'Setor'];
  const widths = [COL_NUM, COL_SIGLA, COL_MODELO, COL_FABRICANTE, COL_SERIAL, COL_IP, COL_SETOR];

  headers.forEach((header, i) => {
    page.drawText(stripAccents(header), {
      x: colX, y: y - 16, size: 8, font: fontBold, color: COLORS.white
    });
    colX += widths[i];
  });

  return y - TABLE_HEADER_HEIGHT;
}

function drawRow(page: any, fontRegular: any, printer: PrinterData, index: number, y: number): number {
  const x = MARGIN;
  const width = PAGE_WIDTH - 2 * MARGIN;
  const isEven = index % 2 === 0;

  // Row background
  if (isEven) {
    page.drawRectangle({ x, y: y - ROW_HEIGHT, width, height: ROW_HEIGHT, color: COLORS.lightBg });
  }

  // Bottom border
  page.drawLine({
    start: { x, y: y - ROW_HEIGHT }, end: { x: x + width, y: y - ROW_HEIGHT },
    thickness: 0.5, color: COLORS.borderColor
  });

  let colX = x + 6;
  const widths = [COL_NUM, COL_SIGLA, COL_MODELO, COL_FABRICANTE, COL_SERIAL, COL_IP, COL_SETOR];
  const values = [
    String(index + 1),
    printer.sigla,
    printer.modelo,
    printer.fabricante,
    printer.serial,
    printer.ip,
    printer.setor
  ];

  values.forEach((val, i) => {
    const maxW = widths[i] - 12;
    page.drawText(truncateText(val, fontRegular, maxW), {
      x: colX, y: y - 14, size: 8, font: fontRegular,
      color: i === 5 ? COLORS.accent : COLORS.primary
    });
    colX += widths[i];
  });

  return y - ROW_HEIGHT;
}

function drawFooter(page: any, fontRegular: any, generatedAt: string, pageNum: number, totalPages: number): void {
  const y = BOTTOM_MARGIN - 20;
  page.drawLine({
    start: { x: MARGIN, y }, end: { x: PAGE_WIDTH - MARGIN, y },
    thickness: 0.5, color: COLORS.borderColor
  });
  page.drawText(stripAccents('Sistema CSDT - Controle de Impressoras'), {
    x: MARGIN, y: y - 12, size: 7, font: fontRegular, color: COLORS.gray
  });
  const pageText = stripAccents(`Pag ${pageNum} de ${totalPages}`);
  const pageWidth = fontRegular.widthOfTextAtSize(pageText, 7);
  page.drawText(pageText, {
    x: PAGE_WIDTH - MARGIN - pageWidth, y: y - 12, size: 7, font: fontRegular, color: COLORS.gray
  });
  const genText = stripAccents(`Gerado em ${generatedAt}`);
  const genWidth = fontRegular.widthOfTextAtSize(genText, 7);
  page.drawText(genText, {
    x: PAGE_WIDTH - MARGIN - genWidth, y: y - 24, size: 7, font: fontRegular, color: COLORS.borderColor
  });
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Metodo nao permitido' });
  }

  const { printers, responsavel } = req.body as { printers: PrinterData[]; responsavel?: string };

  if (!printers || !Array.isArray(printers) || printers.length === 0) {
    return res.status(400).json({ error: 'Lista de impressoras invalida ou vazia' });
  }

  try {
    const pdfDoc = await PDFDocument.create();
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);

    const today = new Date();
    const dateStr = today.toLocaleDateString('pt-BR');
    const generatedAt = `${dateStr} ${today.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
    const respName = responsavel || stripAccents('Sistema');

    // Calculate unique values for stats
    const uniqueFabricantes = new Set(printers.map((p: PrinterData) => p.fabricante)).size;
    const uniqueSetores = new Set(printers.map((p: PrinterData) => p.setor)).size;

    // Calculate total pages
    const PRINTERS_PER_PAGE = 18;
    const totalPages = Math.ceil(printers.length / PRINTERS_PER_PAGE) || 1;

    let page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    let y = PAGE_HEIGHT - MARGIN;

    // First page: full header + stats + table header
    y = drawHeader(page, fontBold, fontRegular, dateStr, respName, y);
    y = drawStats(page, fontBold, fontRegular, printers.length, uniqueFabricantes, uniqueSetores, y);
    y = drawTableHeader(page, fontBold, y);

    let printerIndex = 0;
    let currentPage = 1;

    for (let i = 0; i < printers.length; i++) {
      // Check if we need a new page
      if (y - ROW_HEIGHT < BOTTOM_MARGIN) {
        drawFooter(page, fontRegular, generatedAt, currentPage, totalPages);
        page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
        currentPage++;
        y = PAGE_HEIGHT - MARGIN;
        y = drawMiniHeader(page, fontBold, fontRegular, dateStr, y);
        y = drawTableHeader(page, fontBold, y);
      }

      y = drawRow(page, fontRegular, printers[i], i, y);
      printerIndex++;
    }

    // Draw footer on last page
    drawFooter(page, fontRegular, generatedAt, currentPage, totalPages);

    const pdfBytes = await pdfDoc.save();
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="controle-impressoras.pdf"');
    return res.status(200).send(Buffer.from(pdfBytes));
  } catch (error) {
    console.error('Erro ao gerar PDF:', error);
    return res.status(500).json({ error: 'Erro ao gerar PDF' });
  }
}
```

- [ ] **Step 2: Test the API route**

Start the dev server and test with curl or a REST client:

```bash
curl -X POST http://localhost:3000/api/generate-printer-control-pdf \
  -H "Content-Type: application/json" \
  -d '{"printers":[{"sigla":"IMP-01","modelo":"L210","fabricante":"Epson","serial":"SN12345","ip":"10.0.1.50","setor":"Lab Informatica"}],"responsavel":"Teste"}' \
  --output teste.pdf
```

Expected: A PDF file is downloaded. Open it to verify the header, stats, table, and footer render correctly with accent-stripped text.

- [ ] **Step 3: Commit**

```bash
git add src/pages/api/generate-printer-control-pdf.ts
git commit -m "feat: criar API de geracao de PDF de controle de impressoras"
```

---

### Task 4: Create the Printer Control Page

**Files:**
- Create: `src/pages/controle-impressoras.tsx`

This is the main page component. It follows the patterns from `printers.tsx` for auth/role and from `dashboard.tsx` for ProtectedRoute.

- [ ] **Step 1: Create the page file**

Create `src/pages/controle-impressoras.tsx` with the following full implementation:

```tsx
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../utils/supabase';
import { PrinterCheck, LayoutGrid, List, Search, FileDown, X, Check, ArrowLeft } from 'lucide-react';

interface Printer {
  id: number;
  sigla: string;
  setor: string;
  modelo: string;
  fabricante: string;
  serial: string;
  ip: string;
}

interface EditablePrinter extends Printer {
  selected: boolean;
}

type ViewMode = 'table' | 'cards';

export default function ControleImpressoras() {
  const router = useRouter();
  const [printers, setPrinters] = useState<EditablePrinter[]>([]);
  const [filteredPrinters, setFilteredPrinters] = useState<EditablePrinter[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [userRole, setUserRole] = useState<string>('');
  const [userName, setUserName] = useState<string>('');
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSetor, setFilterSetor] = useState('');
  const [filterFabricante, setFilterFabricante] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const editInputRef = useRef<HTMLInputElement>(null);

  // Auth and role check
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error || !user) {
        router.push('/login');
        return;
      }
      try {
        const response = await fetch(`/api/get-role?userId=${user.id}`);
        if (response.ok) {
          const data = await response.json();
          if (!['ADMTOTAL', 'ADMIN'].includes(data.role)) {
            router.push('/dashboard');
            return;
          }
          setUserRole(data.role);
          setUserName(data.displayName || '');
        }
      } catch (err) {
        console.error('Erro ao buscar role:', err);
        router.push('/dashboard');
      }
    };
    checkAuth();
  }, [router]);

  // Fetch printers
  useEffect(() => {
    const fetchPrinters = async () => {
      try {
        const response = await fetch('/api/printers');
        if (response.ok) {
          const data: Printer[] = await response.json();
          const editable = data.map(p => ({ ...p, selected: false }));
          setPrinters(editable);
          setFilteredPrinters(editable);
        }
      } catch (err) {
        console.error('Erro ao carregar impressoras:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchPrinters();
  }, []);

  // Apply filters
  useEffect(() => {
    let result = [...printers];
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(p =>
        p.sigla.toLowerCase().includes(term) ||
        p.modelo.toLowerCase().includes(term) ||
        p.fabricante.toLowerCase().includes(term) ||
        p.serial.toLowerCase().includes(term) ||
        p.ip.toLowerCase().includes(term) ||
        p.setor.toLowerCase().includes(term)
      );
    }
    if (filterSetor) result = result.filter(p => p.setor === filterSetor);
    if (filterFabricante) result = result.filter(p => p.fabricante === filterFabricante);
    setFilteredPrinters(result);
  }, [printers, searchTerm, filterSetor, filterFabricante]);

  // Derived values for filter dropdowns
  const setores = [...new Set(printers.map(p => p.setor))].sort();
  const fabricantes = [...new Set(printers.map(p => p.fabricante))].sort();
  const selectedCount = filteredPrinters.filter(p => p.selected).length;

  // Toggle selection
  const toggleSelect = (id: number) => {
    setPrinters(prev => prev.map(p => p.id === id ? { ...p, selected: !p.selected } : p));
  };

  const toggleSelectAll = () => {
    const allSelected = filteredPrinters.every(p => p.selected);
    const idsToToggle = new Set(filteredPrinters.map(p => p.id));
    setPrinters(prev => prev.map(p => idsToToggle.has(p.id) ? { ...p, selected: !allSelected } : p));
  };

  // Inline editing
  const startEdit = (id: number, field: string, currentValue: string) => {
    setEditingId(id);
    setEditingField(field);
    setEditValue(currentValue);
  };

  const confirmEdit = () => {
    if (editingId !== null && editingField !== null) {
      setPrinters(prev => prev.map(p =>
        p.id === editingId ? { ...p, [editingField]: editValue } : p
      ));
    }
    setEditingId(null);
    setEditingField(null);
    setEditValue('');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditingField(null);
    setEditValue('');
  };

  // Generate PDF
  const generatePDF = async () => {
    const selected = filteredPrinters.filter(p => p.selected);
    if (selected.length === 0) return;

    setGenerating(true);
    try {
      const response = await fetch('/api/generate-printer-control-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          printers: selected.map(({ sigla, modelo, fabricante, serial, ip, setor }) => ({
            sigla, modelo, fabricante, serial, ip, setor
          })),
          responsavel: userName
        })
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'controle-impressoras.pdf';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      } else {
        console.error('Erro ao gerar PDF');
      }
    } catch (err) {
      console.error('Erro ao gerar PDF:', err);
    } finally {
      setGenerating(false);
    }
  };

  const editableFields = ['modelo', 'fabricante', 'serial', 'ip', 'setor'];

  const renderEditableCell = (printer: EditablePrinter, field: string) => {
    const isEditing = editingId === printer.id && editingField === field;
    const isEditable = editableFields.includes(field);

    if (isEditing) {
      return (
        <input
          ref={editInputRef}
          type="text"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') confirmEdit(); if (e.key === 'Escape') cancelEdit(); }}
          onBlur={confirmEdit}
          className="w-full px-1 py-0.5 text-xs border border-blue-400 rounded bg-yellow-50 focus:outline-none focus:ring-1 focus:ring-blue-500"
          autoFocus
        />
      );
    }

    if (isEditable) {
      return (
        <span
          onClick={() => startEdit(printer.id, field, printer[field as keyof EditablePrinter] as string)}
          className="cursor-pointer hover:bg-yellow-100 px-1 rounded border border-dashed border-transparent hover:border-yellow-300 transition-colors"
          title="Clique para editar"
        >
          {printer[field as keyof EditablePrinter] as string}
        </span>
      );
    }

    return <span className="font-medium">{printer[field as keyof EditablePrinter] as string}</span>;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/dashboard')}
              className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            >
              <ArrowLeft size={20} className="text-gray-600 dark:text-gray-300" />
            </button>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-500 rounded-xl flex items-center justify-center">
                <PrinterCheck size={22} className="text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-800 dark:text-white">Controle de Impressoras</h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">Gerencie e exporte os dados das impressoras</p>
              </div>
            </div>
          </div>
          {/* View toggle */}
          <div className="flex bg-gray-200 dark:bg-gray-700 rounded-lg p-1">
            <button
              onClick={() => setViewMode('table')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'table' ? 'bg-indigo-500 text-white' : 'text-gray-600 dark:text-gray-300 hover:text-gray-800'
              }`}
            >
              <List size={16} /> Tabela
            </button>
            <button
              onClick={() => setViewMode('cards')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'cards' ? 'bg-indigo-500 text-white' : 'text-gray-600 dark:text-gray-300 hover:text-gray-800'
              }`}
            >
              <LayoutGrid size={16} /> Cards
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-4 items-center">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar impressora..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
          </div>
          <select
            value={filterSetor}
            onChange={(e) => setFilterSetor(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-400"
          >
            <option value="">Todos os setores</option>
            {setores.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <select
            value={filterFabricante}
            onChange={(e) => setFilterFabricante(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-400"
          >
            <option value="">Todos os fabricantes</option>
            {fabricantes.map(f => <option key={f} value={f}>{f}</option>)}
          </select>
          <button
            onClick={toggleSelectAll}
            className="px-3 py-2 text-sm border border-indigo-200 dark:border-indigo-700 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors flex items-center gap-1.5"
          >
            {filteredPrinters.every(p => p.selected) ? <><X size={14} /> Desselecionar Todos</> : <><Check size={14} /> Selecionar Todos</>}
          </button>
        </div>

        {/* Content */}
        {filteredPrinters.length === 0 ? (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">
            <PrinterCheck size={48} className="mx-auto mb-4 opacity-30" />
            <p>Nenhuma impressora encontrada</p>
          </div>
        ) : viewMode === 'table' ? (
          /* TABLE VIEW */
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-600">
                    <th className="px-3 py-3 text-left">
                      <input
                        type="checkbox"
                        checked={filteredPrinters.length > 0 && filteredPrinters.every(p => p.selected)}
                        onChange={toggleSelectAll}
                        className="w-4 h-4 rounded border-gray-300 text-indigo-500 focus:ring-indigo-400 accent-indigo-500"
                      />
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Sigla</th>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Modelo</th>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Fabricante</th>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Serial</th>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">IP</th>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Setor</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPrinters.map((printer) => (
                    <tr
                      key={printer.id}
                      className={`border-b border-gray-100 dark:border-gray-700 transition-colors ${
                        printer.selected ? 'bg-indigo-50 dark:bg-indigo-900/20' : 'hover:bg-gray-50 dark:hover:bg-gray-700/30'
                      } ${!printer.selected ? 'opacity-60' : ''}`}
                    >
                      <td className="px-3 py-2.5">
                        <input
                          type="checkbox"
                          checked={printer.selected}
                          onChange={() => toggleSelect(printer.id)}
                          className="w-4 h-4 rounded border-gray-300 text-indigo-500 focus:ring-indigo-400 accent-indigo-500"
                        />
                      </td>
                      <td className="px-3 py-2.5 text-sm font-semibold text-gray-800 dark:text-gray-200">{printer.sigla}</td>
                      <td className="px-3 py-2.5 text-sm text-gray-700 dark:text-gray-300">{renderEditableCell(printer, 'modelo')}</td>
                      <td className="px-3 py-2.5 text-sm text-gray-700 dark:text-gray-300">{renderEditableCell(printer, 'fabricante')}</td>
                      <td className="px-3 py-2.5 text-sm font-mono text-xs text-gray-700 dark:text-gray-300">{renderEditableCell(printer, 'serial')}</td>
                      <td className="px-3 py-2.5 text-sm text-indigo-600 dark:text-indigo-400">{renderEditableCell(printer, 'ip')}</td>
                      <td className="px-3 py-2.5 text-sm text-gray-700 dark:text-gray-300">{renderEditableCell(printer, 'setor')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          /* CARDS VIEW */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredPrinters.map((printer) => (
              <div
                key={printer.id}
                onClick={() => toggleSelect(printer.id)}
                className={`rounded-xl p-4 cursor-pointer transition-all border-2 ${
                  printer.selected
                    ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 dark:border-indigo-400 shadow-md'
                    : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600 opacity-70'
                }`}
              >
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-semibold text-gray-800 dark:text-white text-sm">{printer.sigla}</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{printer.modelo}</p>
                  </div>
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                    printer.selected
                      ? 'bg-indigo-500 text-white'
                      : 'bg-gray-200 dark:bg-gray-600 text-gray-400'
                  }`}>
                    {printer.selected ? <Check size={14} /> : ''}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">Fabricante:</span>
                    <div className="font-medium text-gray-800 dark:text-gray-200" onClick={(e) => e.stopPropagation()}>
                      {renderEditableCell(printer, 'fabricante')}
                    </div>
                  </div>
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">Serial:</span>
                    <div className="font-mono text-gray-800 dark:text-gray-200" onClick={(e) => e.stopPropagation()}>
                      {renderEditableCell(printer, 'serial')}
                    </div>
                  </div>
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">IP:</span>
                    <div className="text-indigo-600 dark:text-indigo-400" onClick={(e) => e.stopPropagation()}>
                      {renderEditableCell(printer, 'ip')}
                    </div>
                  </div>
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">Setor:</span>
                    <div className="text-gray-800 dark:text-gray-200" onClick={(e) => e.stopPropagation()}>
                      {renderEditableCell(printer, 'setor')}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {selectedCount} de {filteredPrinters.length} impressora{filteredPrinters.length !== 1 ? 's' : ''} selecionada{selectedCount !== 1 ? 's' : ''}
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => router.push('/dashboard')}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={generatePDF}
              disabled={selectedCount === 0 || generating}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-500 rounded-lg hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <FileDown size={16} />
              {generating ? 'Gerando PDF...' : 'Gerar PDF'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify the page loads**

Start the dev server and navigate to `/controle-impressoras`. Verify that:
- The page loads with the table/card toggle
- Printers are fetched from `/api/printers` and displayed
- Search and filter dropdowns work
- Toggle between table and cards view works
- Checkboxes/select all works
- Inline editing works (click on modelo, fabricante, serial, IP, setor cells)
- "Gerar PDF" button is disabled when no printers are selected

- [ ] **Step 3: Commit**

```bash
git add src/pages/controle-impressoras.tsx
git commit -m "feat: criar pagina de Controle de Impressoras com tabela, cards e edicao inline"
```

---

### Task 5: End-to-End Verification

- [ ] **Step 1: Test the full flow**

1. Log in as ADMTOTAL or ADMIN
2. Navigate to Dashboard — verify "Controle de Impressoras" card appears in "Escolas e Equipamentos"
3. Click the card — verify it navigates to `/controle-impressoras`
4. Verify printers load from the database
5. Type in the search bar — verify filtering works
6. Select a setor and fabricante from dropdowns — verify filtering
7. Click "Selecionar Todos" — verify all visible printers are checked
8. Click "Desselecionar Todos" — verify all are unchecked
9. Select 2-3 printers
10. Click on a modelo cell — verify inline editing activates
11. Edit the value and press Enter — verify it updates
12. Switch to Cards view — verify layout changes
13. Click a card to toggle selection — verify it works
14. Click "Gerar PDF" — verify a PDF downloads
15. Open the PDF — verify header, stats, table, and footer render correctly
16. Verify the PDF has accent-stripped text (pdf-lib limitation)

- [ ] **Step 2: Test authorization**

1. Log in as TECH or ONLYREAD role
2. Verify the "Controle de Impressoras" card does NOT appear on the Dashboard
3. Navigate directly to `/controle-impressoras` — verify redirect to `/dashboard`

- [ ] **Step 3: Commit verification**

```bash
git status
git log --oneline -5
```

Verify 4 commits exist: Dashboard card, Header item, PDF API, Page component.