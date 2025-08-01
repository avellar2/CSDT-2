import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';
import { supabase } from '@/lib/supabaseClient';

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'DELETE') {
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

  const uid = user.id;

  try {
    const itemId = Number(id);
    
    // Verifique se o item existe e se o usuário logado é o mesmo que registrou o item
    const item = await prisma.item.findUnique({
      where: { id: itemId },
      include: { 
        Profile: true,
        ItemHistory: true,
        MemorandumItem: {
          include: {
            Memorandum: true
          }
        },
        NewMemorandumItem: {
          include: {
            Memorandum: true
          }
        }
      },
    });

    if (!item) {
      return res.status(404).json({ error: 'Item não encontrado' });
    }

    if (!item.Profile || item.Profile.userId !== uid) {
      return res.status(403).json({ error: 'Você não tem permissão para apagar este item' });
    }

    console.log('=== INICIANDO DELEÇÃO EM CASCATA ===');
    console.log(`Item ID: ${itemId} (${item.name} - ${item.serialNumber})`);
    
    // Verificar dados relacionados
    const relatedData = {
      historyCount: item.ItemHistory.length,
      memorandumCount: item.MemorandumItem.length,
      newMemorandumCount: item.NewMemorandumItem.length,
      memorandums: item.MemorandumItem.map(mi => ({
        id: mi.Memorandum.id,
        number: mi.Memorandum.number,
        date: mi.Memorandum.createdAt
      })),
      newMemorandums: item.NewMemorandumItem.map(mi => ({
        id: mi.Memorandum.id,
        number: mi.Memorandum.number,
        date: mi.Memorandum.createdAt
      }))
    };
    
    console.log('Dados relacionados encontrados:', relatedData);

    // Verificar se há registros em ItemsChada (não há FK, então busca manual)
    const chadaRecords = await prisma.itemsChada.findMany({
      where: { itemId: itemId }
    });
    
    console.log(`Registros em ItemsChada: ${chadaRecords.length}`);

    // DELEÇÃO EM CASCATA
    console.log('Iniciando deleção em cascata...');
    
    // 1. Deletar registros ItemsChada relacionados
    if (chadaRecords.length > 0) {
      await prisma.itemsChada.deleteMany({
        where: { itemId: itemId }
      });
      console.log(`✓ Deletados ${chadaRecords.length} registros em ItemsChada`);
    }
    
    // 2. Deletar MemorandumItem relacionados
    if (item.MemorandumItem.length > 0) {
      await prisma.memorandumItem.deleteMany({
        where: { itemId: itemId }
      });
      console.log(`✓ Deletados ${item.MemorandumItem.length} registros em MemorandumItem`);
    }
    
    // 2.1. Deletar NewMemorandumItem relacionados
    if (item.NewMemorandumItem.length > 0) {
      await prisma.newMemorandumItem.deleteMany({
        where: { itemId: itemId }
      });
      console.log(`✓ Deletados ${item.NewMemorandumItem.length} registros em NewMemorandumItem`);
    }
    
    // 3. Deletar ItemHistory relacionados
    if (item.ItemHistory.length > 0) {
      await prisma.itemHistory.deleteMany({
        where: { itemId: itemId }
      });
      console.log(`✓ Deletados ${item.ItemHistory.length} registros em ItemHistory`);
    }
    
    // 4. Finalmente, deletar o item principal
    await prisma.item.delete({
      where: { id: itemId },
    });
    console.log(`✓ Item principal deletado`);

    console.log('=== DELEÇÃO CONCLUÍDA COM SUCESSO ===');

    // Retornar informações sobre o que foi deletado
    res.status(200).json({ 
      message: 'Item e todos os dados relacionados foram apagados com sucesso',
      deletedData: {
        item: {
          id: itemId,
          name: item.name,
          serialNumber: item.serialNumber
        },
        relatedRecords: {
          itemHistory: item.ItemHistory.length,
          memorandumItems: item.MemorandumItem.length,
          newMemorandumItems: item.NewMemorandumItem.length,
          chadaRecords: chadaRecords.length,
          memorandums: relatedData.memorandums,
          newMemorandums: relatedData.newMemorandums
        }
      }
    });
    
  } catch (error) {
    console.error('Erro ao apagar item em cascata:', error);
    res.status(500).json({ error: 'Erro ao apagar item e dados relacionados' });
  }
}