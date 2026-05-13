import { PDFDocument, rgb } from 'pdf-lib';
import fs from 'fs';
import path from 'path';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { buildItemDisplayName } from './itemDisplayName';

const ITEMS_PER_PAGE = 13;

interface MemorandumPdfItem {
  name: string;
  brand: string;
  serialNumber: string;
}

interface OneWayMemorandumPdfData {
  memorandumNumber: string;
  schoolName: string;
  recipientName?: string;
  senderName?: string;
  district: string;
  originDistrict?: string;
  generatedBy: string;
  operationLabel: string;
  operationType?: 'entrega' | 'devolucao';
  date: Date;
  items: MemorandumPdfItem[];
}

export async function generateOneWayMemorandumBase64(data: OneWayMemorandumPdfData) {
  const templateName = data.operationType === 'devolucao' ? 'memorando_devolução.pdf' : 'memorando.pdf';
  const pdfPath = path.join(process.cwd(), 'public', templateName);
  const pdfBytes = fs.readFileSync(pdfPath);
  const totalPages = Math.max(1, Math.ceil(data.items.length / ITEMS_PER_PAGE));
  const formattedDate = format(data.date, "dd 'de' MMMM 'de' yyyy", {
    locale: ptBR,
  });

  const multiPagePdf = await PDFDocument.create();

  for (let currentPage = 0; currentPage < totalPages; currentPage++) {
    const pageTemplate = await PDFDocument.load(pdfBytes);
    const form = pageTemplate.getForm();

    form.getTextField('numeroMemorando').setText(data.memorandumNumber);
    form.getTextField('dataMemorando').setText(formattedDate);
    form.getTextField('escola').setText(data.recipientName || data.schoolName);
    form.getTextField('distrito').setText(data.district || 'nao informado');

    try {
      form.getTextField('conferente')?.setText(data.generatedBy || '');
    } catch {}

    if (data.operationType === 'devolucao') {
      // Preenche campos específicos do template de devolução
      try { form.getTextField('origem')?.setText(data.senderName || data.schoolName); } catch {}
      try { form.getTextField('distritoOrigem')?.setText(data.originDistrict || ''); } catch {}
      // Limpa o campo escola2 do rodapé para não duplicar
      try { form.getTextField('escola2')?.setText(''); } catch {}
    } else {
      try { form.getTextField('escola2')?.setText(data.senderName || data.schoolName); } catch {}
    }

    try {
      form.getTextField('tipoOperacao')?.setText(data.operationLabel);
    } catch {}

    const startIdx = currentPage * ITEMS_PER_PAGE;
    const endIdx = Math.min(startIdx + ITEMS_PER_PAGE, data.items.length);
    const pageItems = data.items.slice(startIdx, endIdx);

    pageItems.forEach((item, index) => {
      form
        .getTextField(`item${index + 1}`)
        .setText(buildItemDisplayName(item.name, item.brand));
      form.getTextField(`serial${index + 1}`).setText(item.serialNumber);
    });

    for (let emptyIdx = pageItems.length; emptyIdx < ITEMS_PER_PAGE; emptyIdx++) {
      try {
        form.getTextField(`item${emptyIdx + 1}`).setText('');
        form.getTextField(`serial${emptyIdx + 1}`).setText('');
      } catch {}
    }

    form.flatten();

    const templatePage = pageTemplate.getPages()[0];
    const helveticaFont = await pageTemplate.embedFont('Helvetica');
    const pageText = totalPages > 1 ? `Pagina ${currentPage + 1}/${totalPages}` : '';
    if (pageText) {
      const textWidth = helveticaFont.widthOfTextAtSize(pageText, 10);
      templatePage.drawText(pageText, {
        x: templatePage.getWidth() - textWidth - 40,
        y: templatePage.getHeight() - 30,
        size: 10,
        font: helveticaFont,
        color: rgb(0.2, 0.2, 0.2),
      });
    }

    const templatePages = await multiPagePdf.copyPages(pageTemplate, [0]);
    multiPagePdf.addPage(templatePages[0]);
  }

  const pdfBytesModified = await multiPagePdf.save();
  return Buffer.from(pdfBytesModified).toString('base64');
}

function drawReturnOperationCopy(page: any, font: any) {
  // Cover old body text area
  page.drawRectangle({
    x: 78,
    y: 438,
    width: 445,
    height: 78,
    color: rgb(1, 1, 1),
  });

  page.drawText('Assunto: Devolução de Equipamentos (locados).', {
    x: 82,
    y: 495,
    size: 10,
    font,
    color: rgb(0, 0, 0),
  });

  page.drawText(
    'Cumprimentando-os cordialmente, viemos por meio deste, formalizar a devolução dos',
    {
      x: 82,
      y: 472,
      size: 10,
      font,
      color: rgb(0, 0, 0),
    }
  );

  page.drawText('seguintes equipamentos locados citados abaixo:', {
    x: 82,
    y: 458,
    size: 10,
    font,
    color: rgb(0, 0, 0),
  });
}
