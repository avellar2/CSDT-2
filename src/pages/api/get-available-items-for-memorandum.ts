import type { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';
import { createClient } from '@supabase/supabase-js';

const prisma = new PrismaClient();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * API para buscar itens disponíveis para adicionar ao memorando
 *
 * Retorna itens que NÃO estão no memorando atual
 *
 * GET /api/get-available-items-for-memorandum?memorandumId=123
 * Headers: { Authorization: "Bearer <token>" }
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    // Verificar autenticação
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ error: 'Token não fornecido' });
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return res.status(401).json({ error: 'Token inválido ou expirado' });
    }

    const { memorandumId } = req.query;

    if (!memorandumId || typeof memorandumId !== 'string') {
      return res.status(400).json({ error: 'ID do memorando é obrigatório' });
    }

    const memId = parseInt(memorandumId, 10);

    // Buscar o memorando
    const memorandum = await prisma.newMemorandum.findUnique({
      where: { id: memId },
      include: {
        NewMemorandumItem: true,
      },
    });

    if (!memorandum) {
      return res.status(404).json({ error: 'Memorando não encontrado' });
    }

    // IDs dos itens que já estão no memorando
    const existingItemIds = memorandum.NewMemorandumItem.map(item => item.itemId);

    // Buscar todos os itens que NÃO estão no memorando
    const availableItems = await prisma.item.findMany({
      where: {
        id: {
          notIn: existingItemIds,
        },
      },
      include: {
        School: true,
      },
      orderBy: [
        { name: 'asc' },
        { serialNumber: 'asc' },
      ],
    });

    // Formatar resposta
    const formattedItems = availableItems.map(item => ({
      id: item.id,
      name: item.name,
      brand: item.brand,
      serialNumber: item.serialNumber,
      status: item.status,
      schoolName: item.School?.name || 'CSDT',
      schoolId: item.schoolId,
    }));

    return res.status(200).json({
      success: true,
      NewMemorandumItem: formattedItems,
      total: formattedItems.length,
    });
  } catch (error: any) {
    console.error('Erro ao buscar itens disponíveis:', error);
    return res.status(500).json({
      error: 'Erro ao buscar itens disponíveis',
      details: error.message,
    });
  } finally {
    await prisma.$disconnect();
  }
}
