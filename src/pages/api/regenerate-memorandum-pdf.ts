import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/utils/prisma';
import { supabase } from '@/lib/supabaseClient';
import { generateMemorandoTrocaBase64, convertMemorandumDataForTroca } from '@/utils/pdfMemorandoTroca';
import { generateOneWayMemorandumBase64 } from '@/utils/pdfMemorandoOneWay';

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
        selectedFromCSDT.push(...itemsWithoutHistory);
      }

      const trocaData = convertMemorandumDataForTroca(memorandum, sourceSchool, targetSchool, {
        selectedFromCSDT,
        selectedFromDestino,
      });

      pdfBase64 = await generateMemorandoTrocaBase64(trocaData);
    } else {
      pdfBase64 = await generateOneWayMemorandumBase64({
        memorandumNumber: memorandum.number,
        schoolName: memorandum.schoolName || '',
        recipientName:
          memorandum.type === 'devolucao'
            ? 'Coordenadoria de Suporte e Desenvolvimento Tecnológico. CSDT/SME'
            : memorandum.schoolName || '',
        senderName:
          memorandum.type === 'devolucao'
            ? buildReturnSenderLine(memorandum.schoolName || '')
            : memorandum.schoolName || '',
        district: memorandum.type === 'devolucao' ? 'SEDE' : (memorandum.district || 'nao informado'),
        originDistrict: memorandum.type === 'devolucao' ? (memorandum.district || 'nao informado') : undefined,
        generatedBy: memorandum.generatedBy || '',
        operationLabel:
          memorandum.type === 'devolucao'
            ? 'DEVOLUCAO DE EQUIPAMENTOS'
            : 'ENTREGA DE EQUIPAMENTOS',
        operationType: memorandum.type === 'devolucao' ? 'devolucao' : 'entrega',
        date: new Date(memorandum.createdAt),
        items: memorandum.items.map((item) => ({
          name: item.Item.name,
          brand: item.Item.brand,
          serialNumber: item.Item.serialNumber,
        })),
      });
    }

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

function buildReturnSenderLine(schoolName: string) {
  const upperName = schoolName.toUpperCase();
  if (upperName.includes('ANEXO')) {
    return schoolName;
  }
  if (upperName.includes('CRECHE')) {
    return `ANEXO (Creche): ${schoolName}`;
  }

  return `ANEXO: ${schoolName}`;
}
