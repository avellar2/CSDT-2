import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';
import { requireAuth } from "@/utils/api-auth";

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Método não permitido' });
  // Requer autenticação
  const auth = await requireAuth(req, res);
  if (!auth) return;

  }

  const { schoolId } = req.query;

  if (!schoolId) {
    return res.status(400).json({ message: 'ID da escola é obrigatório' });
  }

  try {

    // MELHOR: Buscar o nome da escola diretamente no banco
    const school = await prisma.school.findUnique({
      where: {
        id: parseInt(schoolId as string) // ou schoolId as string, dependendo do tipo
      },
      select: {
        id: true,
        name: true
      }
    });

    if (!school) {

      return res.status(200).json({
        hasPendingOs: false,
        totalPending: 0,
        pendingOsOld: 0,
        pendingOsNew: 0,
        error: 'Escola não encontrada'
      });
    }

    const schoolName = school.name;

    // Resto do código permanece igual...
    const allOsOld = await prisma.os.findMany({
      where: {
        unidadeEscolar: schoolName
      },
      select: {
        id: true,
        numeroOs: true,
        unidadeEscolar: true,
        status: true,
        tecnicoResponsavel: true
      }
    });

    const allOsNew = await prisma.oSExterna.findMany({
      where: {
        unidadeEscolar: schoolName
      },
      select: {
        id: true,
        numeroOs: true,
        unidadeEscolar: true,
        status: true,
        tecnicoResponsavel: true
      }
    });



    if (allOsOld.length > 0) {

    }

    if (allOsNew.length > 0) {

    }

    // Filtrar OS não assinadas:
    // - Tabela 'Os': TODAS as OS (independente do status) = não assinadas
    // - Tabela 'OSExterna': Apenas status 'Pendente' = não assinadas
    const pendingOsOld = allOsOld; // TODAS as OS da tabela antiga são não-assinadas
    const pendingOsNew = allOsNew.filter(os => os.status === 'Pendente'); // Apenas Pendentes da nova tabela

    const hasPendingOs = pendingOsOld.length > 0 || pendingOsNew.length > 0;
    const totalPending = pendingOsOld.length + pendingOsNew.length;

    return res.status(200).json({
      hasPendingOs,
      totalPending,
      pendingOsOld: pendingOsOld.length,
      pendingOsNew: pendingOsNew.length,
      debug: {
        schoolId,
        schoolName,
        allRecordsOld: allOsOld.length,
        allRecordsNew: allOsNew.length,
        statusesFound: [...new Set([
          ...allOsOld.map(os => os.status),
          ...allOsNew.map(os => os.status)
        ])]
      }
    });

  } catch (error) {
    console.error('❌ Erro ao verificar OS pendentes:', error);
    return res.status(500).json({
      message: 'Erro interno do servidor',
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  } finally {
    await prisma.$disconnect();
  }
}
