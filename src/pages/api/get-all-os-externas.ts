import { PrismaClient } from '@prisma/client';
import { NextApiRequest, NextApiResponse } from 'next';
import { requireAuth } from "@/utils/api-auth";
import {
  buildAssignedOsWhere,
  buildOperationalOsWhere,
  loadOsScope,
} from "@/utils/operationalOsScope";

const prisma = new PrismaClient();

/**
 * Lista as OS externas visíveis para o usuário autenticado.
 *
 * - ADMIN/ADMTOTAL: enxergam tudo.
 * - TECH: OS operacionais (pendentes) somente das rotas das quais participa;
 *   OS assinadas continuam seguindo a regra anterior (responsável pela OS),
 *   sem redistribuir o histórico entre equipes.
 * - Demais perfis: comportamento anterior preservado.
 *
 * A identidade vem exclusivamente do token — `userId` na query é ignorado.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const auth = await requireAuth(req, res);
  if (!auth) return;

  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    const { status } = req.query;

    const scope = await loadOsScope(auth);
    const operationalWhere = buildOperationalOsWhere(scope);
    const assignedWhere = buildAssignedOsWhere(scope);

    // A listagem combina pendentes e assinadas. Buscar em uma unica query com
    // `take: 500` fazia as assinadas (que sao maioria) ocuparem o limite e as
    // pendentes nunca chegarem ao front. Buscamos cada grupo separadamente,
    // cada um com o seu próprio escopo de visibilidade.
    const osExternas =
      status && typeof status === 'string'
        ? await prisma.oSExterna.findMany({
            where: {
              status,
              ...(status === 'Assinado' ? assignedWhere : operationalWhere),
            },
            orderBy: { createdAt: 'desc' },
            take: 500,
          })
        : (
            await Promise.all([
              prisma.oSExterna.findMany({
                where: { status: { not: 'Assinado' }, ...operationalWhere },
                orderBy: { createdAt: 'desc' },
                take: 500,
              }),
              prisma.oSExterna.findMany({
                where: { status: 'Assinado', ...assignedWhere },
                orderBy: { createdAt: 'desc' },
                take: 500,
              }),
            ])
          ).flat();

    const schoolNames = Array.from(
      new Set(
        osExternas
          .map((os) => os.unidadeEscolar?.trim())
          .filter((name): name is string => Boolean(name))
      )
    );

    const schools = schoolNames.length
      ? await prisma.school.findMany({
          where: {
            name: {
              in: schoolNames,
            },
          },
          select: {
            name: true,
            email: true,
          },
        })
      : [];

    const schoolEmailByName = new Map(
      schools.map((school) => [school.name.trim(), school.email?.trim() || null])
    );

    const normalizedOsExternas = osExternas.map((os) => {
      const schoolEmail = os.unidadeEscolar
        ? schoolEmailByName.get(os.unidadeEscolar.trim())
        : null;

      return {
        ...os,
        emailResponsavel: schoolEmail || os.emailResponsavel,
      };
    });

    res.status(200).json(normalizedOsExternas);
  } catch (error) {
    console.error('Erro ao buscar OS Externas:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      details: error instanceof Error ? error.message : 'Erro desconhecido',
    });
  } finally {
    await prisma.$disconnect();
  }
}
