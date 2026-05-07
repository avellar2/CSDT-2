import { NextApiRequest, NextApiResponse } from 'next';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import fs from 'fs';
import path from 'path';
import prisma from '@/utils/prisma';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '@/lib/supabaseClient';
import { generateMemorandoTrocaBase64, convertMemorandumDataForTroca } from '@/utils/pdfMemorandoTroca';

const ITEMS_PER_PAGE = 13;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized: Token is missing.' });
  }

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token);

  if (error || !user) {
    console.error('Erro ao obter usuario do Supabase:', error);
    return res.status(401).json({ error: 'Unauthorized: User not authenticated.' });
  }

  const { memorandumId } = req.body;
  if (!memorandumId) {
    return res.status(400).json({ error: 'memorandumId e obrigatorio.' });
  }

  try {
    const memorandum = await prisma.newMemorandum.findUnique({
      where: { id: memorandumId },
      include: {
        items: {
          include: {
            Item: true,
          },
        },
      },
    });

    if (!memorandum) {
      return res.status(404).json({ error: 'Memorando nao encontrado.' });
    }

    console.log('Regenerando PDF para memorando:', memorandum.number);

    let pdfBase64: string;

    if (memorandum.type === 'troca') {
      const sourceSchool = memorandum.fromSchoolName
        ? await prisma.school.findFirst({ where: { name: memorandum.fromSchoolName } })
        : null;

      const targetSchool = memorandum.toSchoolName
        ? await prisma.school.findFirst({ where: { name: memorandum.toSchoolName } })
        : null;

      if (!sourceSchool || !targetSchool) {
        return res.status(400).json({
          error: 'Escolas nao encontradas para memorando de troca.',
        });
      }

      const itemIds = memorandum.items.map((item) => item.Item.id);
      const itemHistories = await prisma.itemHistory.findMany({
        where: {
          itemId: { in: itemIds },
          generatedBy: memorandum.generatedBy,
          movedAt: {
            gte: new Date(new Date(memorandum.createdAt).getTime() - 10 * 60 * 1000),
            lte: new Date(new Date(memorandum.createdAt).getTime() + 10 * 60 * 1000),
          },
        },
      });

      const selectedFromCSDT: number[] = [];
      const selectedFromDestino: number[] = [];

      itemHistories.forEach((history) => {
        if (history.fromSchool === 'CSDT' && history.toSchool === targetSchool.name) {
          selectedFromCSDT.push(history.itemId);
        } else if (history.fromSchool === targetSchool.name && history.toSchool === 'CSDT') {
          selectedFromDestino.push(history.itemId);
        } else if (history.fromSchool === sourceSchool.name && history.toSchool === 'CSDT') {
          selectedFromDestino.push(history.itemId);
        } else if (history.fromSchool === 'CSDT' && history.toSchool === sourceSchool.name) {
          selectedFromCSDT.push(history.itemId);
        }
      });

      const itemsWithoutHistory = itemIds.filter(
        (id) => !selectedFromCSDT.includes(id) && !selectedFromDestino.includes(id)
      );

      if (itemsWithoutHistory.length > 0) {
        console.warn(
          'Itens sem historico encontrado, assumindo que sairam do CSDT:',
          itemsWithoutHistory
        );
        selectedFromCSDT.push(...itemsWithoutHistory);
      }

      const trocaData = convertMemorandumDataForTroca(memorandum, sourceSchool, targetSchool, {
        selectedFromCSDT,
        selectedFromDestino,
      });

      pdfBase64 = await generateMemorandoTrocaBase64(trocaData);
    } else {
      pdfBase64 = await generateEntregaPdfBase64(memorandum);
    }

    console.log(`PDF de ${memorandum.type} regenerado com sucesso.`);

    return res.status(200).json({
      pdfBase64,
      type: memorandum.type,
      memorandumNumber: memorandum.number,
      fromSchool: memorandum.fromSchoolName,
      toSchool: memorandum.toSchoolName || memorandum.schoolName,
    });
  } catch (handlerError) {
    console.error('Erro ao regenerar PDF do memorando:', handlerError);

    return res.status(500).json({
      error: 'Internal server error',
      details: handlerError instanceof Error ? handlerError.message : 'Unknown error',
    });
  }
}

async function generateEntregaPdfBase64(
  memorandum: Awaited<ReturnType<typeof prisma.newMemorandum.findUnique>> & {
    items: Array<{
      Item: {
        id: number;
        brand: string;
        serialNumber: string;
      };
    }>;
  }
) {
  const pdfPath = path.join(process.cwd(), 'public', 'memorando.pdf');
  const pdfBytes = fs.readFileSync(pdfPath);
  const totalPages = Math.max(1, Math.ceil(memorandum.items.length / ITEMS_PER_PAGE));
  const formattedDate = format(new Date(memorandum.createdAt), "dd 'de' MMMM 'de' yyyy", {
    locale: ptBR,
  });

  const multiPagePdf = await PDFDocument.create();
  const helveticaFont = await multiPagePdf.embedFont(StandardFonts.Helvetica);

  for (let currentPage = 0; currentPage < totalPages; currentPage++) {
    const pageTemplate = await PDFDocument.load(pdfBytes);
    const form = pageTemplate.getForm();

    form.getTextField('numeroMemorando').setText(`${memorandum.number}`);
    form.getTextField('dataMemorando').setText(formattedDate);
    form.getTextField('escola').setText(memorandum.schoolName || '');
    form.getTextField('distrito').setText(memorandum.district || 'nao informado');

    try {
      form.getTextField('tipoOperacao')?.setText('ENTREGA DE EQUIPAMENTOS');
    } catch {
      console.log('Campo tipoOperacao nao encontrado no PDF');
    }

    try {
      form.getTextField('conferente')?.setText(memorandum.generatedBy || '');
    } catch {
      console.log('Campo conferente nao encontrado no PDF');
    }

    try {
      form.getTextField('escola2')?.setText(memorandum.schoolName || '');
    } catch {
      console.log('Campo escola2 nao encontrado no PDF');
    }

    const startIdx = currentPage * ITEMS_PER_PAGE;
    const endIdx = Math.min(startIdx + ITEMS_PER_PAGE, memorandum.items.length);
    const pageItems = memorandum.items.slice(startIdx, endIdx);

    pageItems.forEach((item, index) => {
      form.getTextField(`item${index + 1}`).setText(`${item.Item.brand}`);
      form.getTextField(`serial${index + 1}`).setText(item.Item.serialNumber);
    });

    for (let emptyIdx = pageItems.length; emptyIdx < ITEMS_PER_PAGE; emptyIdx++) {
      try {
        form.getTextField(`item${emptyIdx + 1}`).setText('');
        form.getTextField(`serial${emptyIdx + 1}`).setText('');
      } catch {
        console.log('Campo vazio de item nao encontrado no PDF');
      }
    }

    form.flatten();

    const templatePage = pageTemplate.getPages()[0];
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

    const [copiedPage] = await multiPagePdf.copyPages(pageTemplate, [0]);
    multiPagePdf.addPage(copiedPage);
  }

  const pdfBytesModified = await multiPagePdf.save();
  return Buffer.from(pdfBytesModified).toString('base64');
}
