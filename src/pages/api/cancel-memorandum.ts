import type { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';
import { createClient } from '@supabase/supabase-js';

const prisma = new PrismaClient();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * API para Cancelar Memorando
 *
 * Quando um memorando é cancelado:
 * 1. Busca todos os itens do memorando
 * 2. Restaura a localização anterior de cada item (usando ItemHistory)
 * 3. Deleta os registros de NewMemorandumItem
 * 4. Deleta o registro de ItemHistory criado pelo memorando
 * 5. Deleta o NewMemorandum
 *
 * POST /api/cancel-memorandum
 * Body: { memorandumId: number }
 * Headers: { Authorization: "Bearer <token>" }
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
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

    // Buscar perfil do usuário para verificar role
    const profile = await prisma.profile.findUnique({
      where: { userId: user.id },
    });

    if (!profile) {
      return res.status(403).json({ error: 'Perfil de usuário não encontrado' });
    }

    // Verificar se tem permissão (apenas ADMIN e ADMTOTAL)
    if (profile.role !== 'ADMIN' && profile.role !== 'ADMTOTAL') {
      return res.status(403).json({
        error: 'Acesso negado. Apenas administradores podem cancelar memorandos.'
      });
    }

    const { memorandumId } = req.body;

    if (!memorandumId || typeof memorandumId !== 'number') {
      return res.status(400).json({ error: 'ID do memorando é obrigatório' });
    }

    // Buscar o memorando com seus itens
    const memorandum = await prisma.newMemorandum.findUnique({
      where: { id: memorandumId },
      include: {
        items: {
          include: {
            Item: {
              include: {
                School: true,
              },
            },
          },
        },
      },
    });

    if (!memorandum) {
      return res.status(404).json({ error: 'Memorando não encontrado' });
    }

    const itemIds = memorandum.items.map(item => item.itemId);

    if (itemIds.length === 0) {
      return res.status(400).json({ error: 'Memorando não possui itens vinculados' });
    }

    // Buscar histórico de movimentação para cada item
    // Precisamos encontrar a escola anterior (fromSchool) antes deste memorando
    const itemHistories = await prisma.itemHistory.findMany({
      where: {
        itemId: { in: itemIds },
        generatedBy: memorandum.generatedBy,
      },
      orderBy: {
        movedAt: 'desc',
      },
    });

    console.log(`[Cancelamento] Memorando #${memorandum.number} - Cancelando...`);
    console.log(`[Cancelamento] Itens a restaurar: ${itemIds.length}`);

    // Agrupar históricos por itemId para facilitar busca
    const historyByItem = new Map<number, typeof itemHistories[0]>();
    itemHistories.forEach(history => {
      if (!historyByItem.has(history.itemId)) {
        historyByItem.set(history.itemId, history);
      }
    });

    // Preparar atualizações de itens
    const itemUpdates: Array<{ itemId: number, previousSchoolName: string | null }> = [];

    for (const item of memorandum.items) {
      const history = historyByItem.get(item.itemId);

      if (history) {
        // Restaurar para a escola de origem (fromSchool)
        const previousSchoolName = history.fromSchool;
        itemUpdates.push({
          itemId: item.itemId,
          previousSchoolName,
        });
      } else {
        // Se não encontrar histórico, tentar restaurar para null (CSDT)
        console.warn(`[Cancelamento] Histórico não encontrado para item ${item.itemId}`);
        itemUpdates.push({
          itemId: item.itemId,
          previousSchoolName: null,
        });
      }
    }

    // Executar operações em uma transação
    await prisma.$transaction(async (tx) => {
      // 1. Restaurar localização dos itens
      for (const update of itemUpdates) {
        // Buscar a escola anterior pelo nome
        let previousSchoolId: number | null = null;

        if (update.previousSchoolName) {
          const previousSchool = await tx.school.findFirst({
            where: { name: update.previousSchoolName },
          });
          previousSchoolId = previousSchool?.id || null;
        }

        await tx.item.update({
          where: { id: update.itemId },
          data: {
            schoolId: previousSchoolId,
            updatedAt: new Date(),
          },
        });

        console.log(
          `[Cancelamento] Item ${update.itemId} restaurado para: ${
            update.previousSchoolName || 'CSDT (sem escola)'
          }`
        );
      }

      // 2. Deletar registros de ItemHistory criados por este memorando
      await tx.itemHistory.deleteMany({
        where: {
          itemId: { in: itemIds },
          generatedBy: memorandum.generatedBy,
          movedAt: {
            gte: new Date(memorandum.createdAt.getTime() - 5000), // 5 segundos de margem
            lte: new Date(memorandum.createdAt.getTime() + 5000),
          },
        },
      });

      console.log(`[Cancelamento] Histórico de ${itemIds.length} itens removido`);

      // 3. Deletar registros de NewMemorandumItem
      await tx.newMemorandumItem.deleteMany({
        where: { memorandumId: memorandumId },
      });

      console.log(`[Cancelamento] Vínculo de ${itemIds.length} itens removido`);

      // 4. Deletar o NewMemorandum
      await tx.newMemorandum.delete({
        where: { id: memorandumId },
      });

      console.log(`[Cancelamento] Memorando #${memorandum.number} deletado`);
    });

    return res.status(200).json({
      success: true,
      message: `Memorando #${memorandum.number} cancelado com sucesso`,
      restoredItems: itemIds.length,
      memorandumNumber: memorandum.number,
    });
  } catch (error: any) {
    console.error('[Cancelamento] Erro ao cancelar memorando:', error);
    return res.status(500).json({
      error: 'Erro ao cancelar memorando',
      details: error.message,
    });
  } finally {
    await prisma.$disconnect();
  }
}
