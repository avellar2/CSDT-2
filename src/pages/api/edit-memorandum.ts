import type { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';
import { createClient } from '@supabase/supabase-js';

const prisma = new PrismaClient();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * API para Editar Memorando
 *
 * Permite adicionar ou remover itens de um memorando existente
 *
 * POST /api/edit-memorandum
 * Body: {
 *   memorandumId: number,
 *   itemsToAdd?: number[],     // IDs dos itens a adicionar
 *   itemsToRemove?: number[]   // IDs dos itens a remover
 * }
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

    // Buscar perfil do usuário
    const profile = await prisma.profile.findUnique({
      where: { userId: user.id },
    });

    if (!profile) {
      return res.status(403).json({ error: 'Perfil de usuário não encontrado' });
    }

    // Verificar permissão (ADMIN e ADMTOTAL)
    if (profile.role !== 'ADMIN' && profile.role !== 'ADMTOTAL') {
      return res.status(403).json({
        error: 'Acesso negado. Apenas administradores podem editar memorandos.'
      });
    }

    const { memorandumId, itemsToAdd = [], itemsToRemove = [] } = req.body;

    if (!memorandumId || typeof memorandumId !== 'number') {
      return res.status(400).json({ error: 'ID do memorando é obrigatório' });
    }

    if (itemsToAdd.length === 0 && itemsToRemove.length === 0) {
      return res.status(400).json({
        error: 'Nenhuma alteração especificada. Forneça itemsToAdd ou itemsToRemove.'
      });
    }

    // Buscar o memorando
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
      return res.status(404).json({ error: 'Memorando não encontrado' });
    }

    console.log(`[Edição] Memorando #${memorandum.number} - Iniciando edição...`);
    console.log(`[Edição] Itens a adicionar: ${itemsToAdd.length}`);
    console.log(`[Edição] Itens a remover: ${itemsToRemove.length}`);

    // Extrair o nome da escola de destino
    // Para TROCA: "CSDT → ESCOLA" => pega "ESCOLA"
    // Para ENTREGA: "ESCOLA" => pega "ESCOLA"
    const schoolNameToSearch = memorandum.schoolName.includes('→')
      ? memorandum.schoolName.split('→')[1].trim()
      : memorandum.schoolName.trim();

    console.log(`[Edição] Buscando escola: "${schoolNameToSearch}"`);

    // Buscar a escola de destino antes da transação
    const targetSchool = await prisma.school.findFirst({
      where: { name: schoolNameToSearch },
    });

    if (!targetSchool) {
      console.error(`[Edição] Escola "${schoolNameToSearch}" não encontrada no sistema`);
      return res.status(404).json({
        error: 'Escola não encontrada no sistema',
        schoolName: schoolNameToSearch,
        originalName: memorandum.schoolName,
        suggestion: 'Verifique se a escola existe no cadastro ou se o nome está correto. Você pode precisar cadastrar a escola manualmente primeiro.',
      });
    }

    console.log(`[Edição] Escola encontrada: ${targetSchool.name} (ID: ${targetSchool.id})`);

    // Executar edições em transação
    const result = await prisma.$transaction(async (tx) => {
      let addedCount = 0;
      let removedCount = 0;

      // ========== ADICIONAR NOVOS ITENS ==========
      if (itemsToAdd.length > 0) {
        for (const itemId of itemsToAdd) {
          // Verificar se o item já está no memorando
          const existingLink = await tx.newMemorandumItem.findFirst({
            where: {
              memorandumId: memorandumId,
              itemId: itemId,
            },
          });

          if (existingLink) {
            console.warn(`[Edição] Item ${itemId} já está no memorando, pulando...`);
            continue;
          }

          // Buscar o item
          const item = await tx.item.findUnique({
            where: { id: itemId },
            include: { School: true },
          });

          if (!item) {
            console.warn(`[Edição] Item ${itemId} não encontrado, pulando...`);
            continue;
          }

          // Guardar localização anterior para histórico
          const previousSchoolName = item.School?.name || 'CSDT';

          // Criar vínculo NewMemorandumItem
          await tx.newMemorandumItem.create({
            data: {
              memorandumId: memorandumId,
              itemId: itemId,
            },
          });

          // Atualizar localização do item
          await tx.item.update({
            where: { id: itemId },
            data: {
              schoolId: targetSchool.id,
              updatedAt: new Date(),
            },
          });

          // Criar registro de histórico
          await tx.itemHistory.create({
            data: {
              itemId: itemId,
              fromSchool: previousSchoolName,
              toSchool: memorandum.schoolName,
              generatedBy: memorandum.generatedBy,
              movedAt: new Date(),
            },
          });

          console.log(
            `[Edição] Item ${itemId} adicionado: ${previousSchoolName} → ${memorandum.schoolName}`
          );
          addedCount++;
        }
      }

      // ========== REMOVER ITENS ==========
      if (itemsToRemove.length > 0) {
        for (const itemId of itemsToRemove) {
          // Verificar se o item está no memorando
          const existingLink = await tx.newMemorandumItem.findFirst({
            where: {
              memorandumId: memorandumId,
              itemId: itemId,
            },
          });

          if (!existingLink) {
            console.warn(`[Edição] Item ${itemId} não está no memorando, pulando...`);
            continue;
          }

          // Buscar histórico para restaurar localização anterior
          const history = await tx.itemHistory.findFirst({
            where: {
              itemId: itemId,
              generatedBy: memorandum.generatedBy,
            },
            orderBy: {
              movedAt: 'desc',
            },
          });

          let previousSchoolId: number | null = null;
          let previousSchoolName = 'CSDT';

          if (history) {
            previousSchoolName = history.fromSchool;
            const previousSchool = await tx.school.findFirst({
              where: { name: history.fromSchool },
            });
            previousSchoolId = previousSchool?.id || null;
          }

          // Remover vínculo NewMemorandumItem
          await tx.newMemorandumItem.delete({
            where: { id: existingLink.id },
          });

          // Restaurar localização do item
          await tx.item.update({
            where: { id: itemId },
            data: {
              schoolId: previousSchoolId,
              updatedAt: new Date(),
            },
          });

          // Deletar histórico relacionado
          if (history) {
            await tx.itemHistory.delete({
              where: { id: history.id },
            });
          }

          console.log(
            `[Edição] Item ${itemId} removido e restaurado para: ${previousSchoolName}`
          );
          removedCount++;
        }
      }

      return { addedCount, removedCount };
    });

    console.log(`[Edição] Memorando #${memorandum.number} editado com sucesso`);

    return res.status(200).json({
      success: true,
      message: `Memorando #${memorandum.number} editado com sucesso`,
      addedItems: result.addedCount,
      removedItems: result.removedCount,
      memorandumNumber: memorandum.number,
    });
  } catch (error: any) {
    console.error('[Edição] Erro ao editar memorando:', error);
    return res.status(500).json({
      error: 'Erro ao editar memorando',
      details: error.message,
    });
  } finally {
    await prisma.$disconnect();
  }
}
