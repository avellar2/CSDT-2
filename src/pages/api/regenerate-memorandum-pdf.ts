import { NextApiRequest, NextApiResponse } from 'next';
import { PDFDocument } from 'pdf-lib';
import fs from 'fs';
import path from 'path';
import prisma from '@/utils/prisma';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '@/lib/supabaseClient';
import { generateMemorandoTrocaBase64, convertMemorandumDataForTroca } from '@/utils/pdfMemorandoTroca';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Obtenha o token do cabeçalho
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized: Token is missing.' });
  }

  // Obtenha o usuário logado do Supabase
  const { data: { user }, error } = await supabase.auth.getUser(token);

  if (error || !user) {
    console.error('Erro ao obter usuário do Supabase:', error);
    return res.status(401).json({ error: 'Unauthorized: User not authenticated.' });
  }

  // Extrair dados do request
  const { memorandumId } = req.body;

  if (!memorandumId) {
    return res.status(400).json({ error: 'memorandumId é obrigatório.' });
  }

  try {
    // Buscar memorando existente
    const memorandum = await prisma.newMemorandum.findUnique({
      where: { id: memorandumId },
      include: {
        NewMemorandumItem: {
          include: {
            Item: true,
          },
        },
      },
    });

    if (!memorandum) {
      return res.status(404).json({ error: 'Memorando não encontrado.' });
    }

    console.log('Regenerando PDF para memorando:', memorandum.number);

    // GERAR PDF
    let pdfBase64: string;

    if (memorandum.type === 'troca') {
      // Buscar escolas para memorando de troca
      const sourceSchool = memorandum.fromSchoolName ? await prisma.school.findFirst({
        where: { name: memorandum.fromSchoolName }
      }) : null;

      const targetSchool = memorandum.toSchoolName ? await prisma.school.findFirst({
        where: { name: memorandum.toSchoolName }
      }) : null;

      if (!sourceSchool || !targetSchool) {
        return res.status(400).json({ 
          error: 'Escolas não encontradas para memorando de troca.' 
        });
      }

      // Para memorandos de troca, reconstruir a separação dos itens baseado no histórico
      const itemIds = memorandum.NewMemorandumItem.map(item => item.Item.id);
      
      // Buscar histórico dos itens no momento da criação do memorando
      const itemHistories = await prisma.itemHistory.findMany({
        where: {
          itemId: { in: itemIds },
          generatedBy: memorandum.generatedBy, // Mesmo usuário que criou o memorando
          movedAt: {
            // Buscar históricos criados próximo ao momento de criação do memorando (±10 minutos)
            gte: new Date(new Date(memorandum.createdAt).getTime() - 10 * 60 * 1000),
            lte: new Date(new Date(memorandum.createdAt).getTime() + 10 * 60 * 1000)
          }
        }
      });

      console.log('Histórico encontrado para memorando de troca:', itemHistories);
      
      // Separar itens baseado na direção do movimento no histórico
      const selectedFromCSDT: number[] = [];
      const selectedFromDestino: number[] = [];
      
      itemHistories.forEach(history => {
        if (history.fromSchool === 'CSDT' && history.toSchool === targetSchool.name) {
          // Item saiu do CSDT para a escola
          selectedFromCSDT.push(history.itemId);
        } else if (history.fromSchool === targetSchool.name && history.toSchool === 'CSDT') {
          // Item voltou da escola para o CSDT
          selectedFromDestino.push(history.itemId);
        } else if (history.fromSchool === sourceSchool.name && history.toSchool === 'CSDT') {
          // Item voltou da escola de origem para o CSDT
          selectedFromDestino.push(history.itemId);
        } else if (history.fromSchool === 'CSDT' && history.toSchool === sourceSchool.name) {
          // Item saiu do CSDT para a escola de origem (caso especial)
          selectedFromCSDT.push(history.itemId);
        }
      });

      console.log('Itens que saíram do CSDT:', selectedFromCSDT);
      console.log('Itens que voltaram para o CSDT:', selectedFromDestino);
      
      // Fallback: se não encontrou histórico para alguns itens, 
      // assumir que todos os itens restantes saíram do CSDT
      const itemsWithoutHistory = itemIds.filter(id => 
        !selectedFromCSDT.includes(id) && !selectedFromDestino.includes(id)
      );
      
      if (itemsWithoutHistory.length > 0) {
        console.warn('Itens sem histórico encontrado, assumindo que saíram do CSDT:', itemsWithoutHistory);
        selectedFromCSDT.push(...itemsWithoutHistory);
      }
      
      const mockTrocaData = {
        selectedFromCSDT,
        selectedFromDestino
      };

      const trocaData = convertMemorandumDataForTroca(memorandum, sourceSchool, targetSchool, mockTrocaData);
      pdfBase64 = await generateMemorandoTrocaBase64(trocaData);
      
    } else {
      // Lógica para memorando de entrega
      const pdfFileName = 'memorando.pdf';
      const pdfPath = path.join(process.cwd(), "public", pdfFileName);
      const pdfBytes = fs.readFileSync(pdfPath);
      const pdfDoc = await PDFDocument.load(pdfBytes);
      const form = pdfDoc.getForm();

      // Preencher campos básicos
      form.getTextField("numeroMemorando").setText(`${memorandum.number}`);

      // Formatar a data de criação do memorando
      const formattedDate = format(new Date(memorandum.createdAt), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
      form.getTextField("dataMemorando").setText(formattedDate);

      // Preencher campos para entrega
      form.getTextField("escola").setText(memorandum.schoolName || '');
      form.getTextField("distrito").setText(memorandum.district || "não informado");

      // Campos opcionais
      try {
        form.getTextField("tipoOperacao")?.setText("ENTREGA DE EQUIPAMENTOS");
      } catch (e) {
        console.log("Campo tipoOperacao não encontrado no PDF");
      }

      // Preencher itens
      memorandum.NewMemorandumItem.forEach((item, index) => {
        if (index >= 13) return; // Limite de 13 itens
        const itemWithBrand = `${item.Item.brand}`;
        form.getTextField(`item${index + 1}`).setText(itemWithBrand);
        form.getTextField(`serial${index + 1}`).setText(item.Item.serialNumber);
      });

      form.flatten();
      const pdfBytesModified = await pdfDoc.save();
      pdfBase64 = Buffer.from(pdfBytesModified).toString("base64");
    }

    console.log(`PDF de ${memorandum.type} regenerado com sucesso.`);
    
    res.status(200).json({
      pdfBase64,
      type: memorandum.type,
      memorandumNumber: memorandum.number,
      fromSchool: memorandum.fromSchoolName,
      toSchool: memorandum.toSchoolName || memorandum.schoolName
    });

  } catch (error) {
    console.error("Erro ao regenerar PDF do memorando:", error);
    
    res.status(500).json({
      error: "Internal server error",
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}