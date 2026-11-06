import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';
import { requireAuth } from "@/utils/api-auth";

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Requer autenticação (validada antes de qualquer consulta)
  const auth = await requireAuth(req, res);
  if (!auth) return;

  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { schoolId } = req.query;

    if (!schoolId) {
      return res.status(400).json({ error: 'schoolId é obrigatório' });
    }

    const parsedSchoolId = Number(schoolId);
    if (!Number.isInteger(parsedSchoolId) || parsedSchoolId <= 0) {
      return res.status(400).json({ error: 'schoolId inválido' });
    }

    // Usuário de escola só enxerga os chamados excluídos da própria escola.
    // Perfil SCHOOL sem escola vinculada não tem escopo legítimo: nega em vez
    // de liberar a consulta para qualquer escola.
    if (auth.profile.role === 'SCHOOL') {
      if (auth.profile.schoolId === null || parsedSchoolId !== auth.profile.schoolId) {
        return res.status(403).json({ error: 'Você não tem acesso a estes chamados.' });
      }
    }

    // Buscar chamados excluídos da escola
    const deletedTickets = await prisma.technicalTicket.findMany({
      where: {
        schoolId: parsedSchoolId,
        status: 'DELETED'
      },
      include: {
        School: true
      },
      orderBy: {
        deletedAt: 'desc'
      }
    });

    res.status(200).json({
      success: true,
      deletedTickets,
      count: deletedTickets.length
    });

  } catch (error) {
    console.error('Erro ao buscar chamados excluídos:', error);
    res.status(500).json({ 
      error: 'Erro interno do servidor',
      details: process.env.NODE_ENV === 'development' ? error : undefined
    });
  } finally {
    await prisma.$disconnect();
  }
}