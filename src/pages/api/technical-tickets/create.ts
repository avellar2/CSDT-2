import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';
import { requireAuth } from "@/utils/api-auth";

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const auth = await requireAuth(req, res);
  if (!auth) return;

  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const {
      schoolId,
      title,
      description,
      category,
      equipmentAffected,
      attachments
    } = req.body;

    // Validações
    if (!schoolId || !title || !description) {
      return res.status(400).json({
        error: 'Campos obrigatórios: schoolId, title, description'
      });
    }

    const parsedSchoolId = Number(schoolId);
    if (!Number.isInteger(parsedSchoolId) || parsedSchoolId <= 0) {
      return res.status(400).json({ error: 'schoolId inválido' });
    }

    // ONLYREAD é somente leitura: não abre chamados.
    if (auth.profile.role === 'ONLYREAD') {
      return res.status(403).json({
        error: 'Perfil sem permissão para abrir chamados técnicos.'
      });
    }

    // Usuário de escola só abre chamados para a própria escola. SCHOOL sem
    // escola vinculada não tem escopo legítimo e é negado.
    if (auth.profile.role === 'SCHOOL') {
      if (auth.profile.schoolId === null || parsedSchoolId !== auth.profile.schoolId) {
        return res.status(403).json({
          error: 'Você só pode abrir chamados para a sua escola.'
        });
      }
    }

    // Criar o chamado técnico
    const ticket = await prisma.technicalTicket.create({
      data: {
        schoolId: parsedSchoolId,
        title: title.trim(),
        description: description.trim(),
        category: category || 'OTHER',
        equipmentAffected: equipmentAffected?.trim() || null,
        // Autor da criação vem da sessão autenticada, nunca do corpo.
        createdBy: auth.id,
        attachments: attachments || [],
        status: 'OPEN',
        updatedAt: new Date()
      },
      include: {
        School: true
      }
    });

    res.status(201).json({
      success: true,
      ticket
    });

  } catch (error) {
    console.error('Erro ao criar chamado técnico:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      details: process.env.NODE_ENV === 'development' ? error : undefined
    });
  } finally {
    await prisma.$disconnect();
  }
}
