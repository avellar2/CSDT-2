import { PrismaClient } from '@prisma/client';
import { NextApiRequest, NextApiResponse } from 'next';
import { requireAuth } from "@/utils/api-auth";

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método não permitido' });
  // Requer autenticação
  const auth = await requireAuth(req, res);
  if (!auth) return;

  }

  try {
    const { userId, status } = req.query;
    let tecnicoResponsavelFilter: string | undefined;

    if (userId && typeof userId === 'string') {
      const profile = await prisma.profile.findUnique({
        where: { userId },
        select: { role: true, displayName: true },
      });

      if (profile?.role === 'TECH') {
        tecnicoResponsavelFilter = profile.displayName;
      }
    }

    const baseWhere = tecnicoResponsavelFilter
      ? { tecnicoResponsavel: { contains: tecnicoResponsavelFilter } }
      : {};

    // A listagem combina pendentes e assinadas. Buscar em uma unica query com
    // `take: 500` fazia as assinadas (que sao maioria) ocuparem o limite e as
    // pendentes nunca chegarem ao front. Buscamos cada grupo separadamente.
    const osExternas =
      status && typeof status === 'string'
        ? await prisma.oSExterna.findMany({
            where: { ...baseWhere, status },
            orderBy: { createdAt: 'desc' },
            take: 500,
          })
        : (
            await Promise.all([
              prisma.oSExterna.findMany({
                where: { ...baseWhere, status: { not: 'Assinado' } },
                orderBy: { createdAt: 'desc' },
                take: 500,
              }),
              prisma.oSExterna.findMany({
                where: { ...baseWhere, status: 'Assinado' },
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
