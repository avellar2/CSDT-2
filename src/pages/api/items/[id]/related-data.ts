import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';
import { supabase } from '@/lib/supabaseClient';

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  const { id } = req.query;
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Token não fornecido' });
  }

  const { data: { user }, error } = await supabase.auth.getUser(token);

  if (error || !user) {
    return res.status(401).json({ error: 'Usuário não autenticado' });
  }

  try {
    const itemId = Number(id);
    
    // Buscar o item com todos os dados relacionados
    const item = await prisma.item.findUnique({
      where: { id: itemId },
      include: { 
        Profile: true,
        School: true,
        ItemHistory: {
          orderBy: { movedAt: 'desc' },
          take: 5 // Mostrar apenas os 5 mais recentes
        },
        MemorandumItem: {
          include: {
            Memorandum: {
              select: {
                id: true,
                number: true,
                schoolName: true,
                type: true,
                createdAt: true
              }
            }
          }
        },
        NewMemorandumItem: {
          include: {
            Memorandum: {
              select: {
                id: true,
                number: true,
                schoolName: true,
                type: true,
                createdAt: true
              }
            }
          }
        }
      },
    });

    if (!item) {
      return res.status(404).json({ error: 'Item não encontrado' });
    }

    // Verificar se há registros em ItemsChada
    const chadaRecords = await prisma.itemsChada.findMany({
      where: { itemId: itemId },
      select: {
        id: true,
        problem: true,
        status: true,
        createdAt: true,
        setor: true
      }
    });

    // Preparar resumo dos dados relacionados
    const relatedData = {
      item: {
        id: item.id,
        name: item.name,
        brand: item.brand,
        serialNumber: item.serialNumber,
        school: item.School?.name || 'Não informado',
        createdBy: item.Profile?.displayName || 'Não informado'
      },
      relationships: {
        history: {
          count: item.ItemHistory.length,
          recent: item.ItemHistory.map(h => ({
            from: h.fromSchool,
            to: h.toSchool,
            date: h.movedAt,
            generatedBy: h.generatedBy
          }))
        },
        memorandums: {
          count: item.MemorandumItem.length,
          list: item.MemorandumItem.map(mi => ({
            memorandumId: mi.Memorandum.id,
            number: mi.Memorandum.number,
            school: mi.Memorandum.schoolName,
            type: mi.Memorandum.type,
            date: mi.Memorandum.createdAt
          }))
        },
        newMemorandums: {
          count: item.NewMemorandumItem.length,
          list: item.NewMemorandumItem.map(mi => ({
            memorandumId: mi.Memorandum.id,
            number: mi.Memorandum.number,
            school: mi.Memorandum.schoolName,
            type: mi.Memorandum.type,
            date: mi.Memorandum.createdAt
          }))
        },
        chada: {
          count: chadaRecords.length,
          list: chadaRecords.map(cr => ({
            id: cr.id,
            problem: cr.problem,
            status: cr.status,
            setor: cr.setor,
            date: cr.createdAt
          }))
        }
      },
      canDelete: item.Profile?.userId === user.id, // Verificar permissão
      totalRelatedRecords: item.ItemHistory.length + item.MemorandumItem.length + item.NewMemorandumItem.length + chadaRecords.length
    };

    res.status(200).json(relatedData);
    
  } catch (error) {
    console.error('Erro ao buscar dados relacionados:', error);
    res.status(500).json({ error: 'Erro ao buscar dados relacionados' });
  }
}