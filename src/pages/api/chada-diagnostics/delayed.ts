import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Buscar apenas diagnósticos aguardando peças (não finalizados)
    const diagnostics = await prisma.chadaDiagnostic.findMany({
      where: {
        status: 'AGUARDANDO_PECA'
      },
      include: {
        Item: {
          select: {
            id: true,
            name: true,
            brand: true,
            serialNumber: true
          }
        },
        School: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: {
        createdAt: 'asc' // Os mais antigos primeiro
      }
    });

    // Calcular tempo e filtrar apenas os atrasados (3+ dias)
    const today = new Date();
    const delayedDiagnostics = diagnostics
      .map(diagnostic => {
        const createdAt = new Date(diagnostic.createdAt);
        const diffTime = Math.abs(today.getTime() - createdAt.getTime());
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        
        return {
          ...diagnostic,
          daysWaiting: diffDays,
          isDelayed: diffDays >= 3
        };
      })
      .filter(diagnostic => diagnostic.isDelayed); // Apenas os atrasados

    // Estatísticas dos atrasados
    const stats = {
      total: delayedDiagnostics.length,
      moreThan7Days: delayedDiagnostics.filter(d => d.daysWaiting >= 7).length,
      moreThan14Days: delayedDiagnostics.filter(d => d.daysWaiting >= 14).length,
      oldestDays: delayedDiagnostics.length > 0 ? Math.max(...delayedDiagnostics.map(d => d.daysWaiting)) : 0
    };

    res.status(200).json({
      diagnostics: delayedDiagnostics,
      stats: stats
    });
  } catch (error) {
    console.error('Erro ao buscar diagnósticos atrasados:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
}