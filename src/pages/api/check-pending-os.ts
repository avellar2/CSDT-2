import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';
import { requireAuth } from "@/utils/api-auth";
import {
  buildOperationalOsWhere,
  loadOsScope,
} from "@/utils/operationalOsScope";

const prisma = new PrismaClient();

/**
 * Verifica se uma escola possui OS pendentes.
 *
 * A identidade vem do token. Técnicos só enxergam as OS das próprias rotas
 * (e as OS antigas em que são responsáveis); gestores enxergam tudo.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const auth = await requireAuth(req, res);
  if (!auth) return;

  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ message: 'Método não permitido' });
  }

  const { schoolId } = req.query;

  if (!schoolId) {
    return res.status(400).json({ message: 'ID da escola é obrigatório' });
  }

  try {
    const parsedSchoolId = Number(schoolId);
    if (!Number.isInteger(parsedSchoolId) || parsedSchoolId <= 0) {
      return res.status(400).json({ message: 'ID da escola inválido' });
    }

    // Buscar o nome da escola diretamente no banco
    const school = await prisma.school.findUnique({
      where: {
        id: parsedSchoolId
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
    const scope = await loadOsScope(auth);

    // OS antigas (tabela Os) não têm rota: para técnicos mantemos o filtro
    // histórico pelo nome do responsável; gestores continuam vendo tudo.
    const legacyWhere = {
      unidadeEscolar: schoolName,
      ...(scope.isTechnician
        ? { tecnicoResponsavel: { contains: scope.displayName } }
        : {}),
    };

    const allOsOld = await prisma.os.findMany({
      where: legacyWhere,
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
        unidadeEscolar: schoolName,
        ...buildOperationalOsWhere(scope),
      },
      select: {
        id: true,
        numeroOs: true,
        unidadeEscolar: true,
        status: true,
        tecnicoResponsavel: true
      }
    });

    // Filtrar OS não assinadas:
    // - Tabela 'Os': TODAS as OS (independente do status) = não assinadas
    // - Tabela 'OSExterna': Apenas status 'Pendente' = não assinadas
    const pendingOsOld = allOsOld;
    const pendingOsNew = allOsNew.filter(os => os.status === 'Pendente');

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
