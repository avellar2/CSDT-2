import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/utils/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { type } = req.query;

  if (!type || (type !== 'internalOs' && type !== 'osAssinadas')) {
    return res.status(400).json({ error: 'Tipo inválido. Use "internalOs" ou "osAssinadas".' });
  }

  try {
    // Busca os nomes dos técnicos e setores
    const technicians = await prisma.profile.findMany({
      select: { id: true, displayName: true },
    });
    const sectors = await prisma.school.findMany({
      select: { id: true, name: true },
    });

    // Cria mapas para facilitar a conversão de IDs para nomes
    const technicianMap = Object.fromEntries(technicians.map((t) => [t.id, t.displayName]));
    const sectorMap = Object.fromEntries(sectors.map((s) => [s.id, s.name]));

    // Estatísticas por técnico
    const technicianData =
      type === 'internalOs'
        ? await prisma.internalOS.groupBy({
          by: ['tecnicoId'],
          _count: {
            tecnicoId: true,
          },
          orderBy: {
            _count: {
              tecnicoId: 'desc',
            },
          },
        })
        : await prisma.osAssinada.groupBy({
          by: ['tecnicoResponsavel'],
          _count: {
            tecnicoResponsavel: true,
          },
          orderBy: {
            _count: {
              tecnicoResponsavel: 'desc',
            },
          },
        });

    // Estatísticas por setor/escola
    const schoolData =
      type === 'osAssinadas'
        ? await prisma.osAssinada.groupBy({
          by: ['unidadeEscolar'],
          _count: {
            unidadeEscolar: true,
          },
          orderBy: {
            _count: {
              unidadeEscolar: 'desc',
            },
          },
        })
        : await prisma.internalOS.groupBy({
          by: ['setorId'],
          _count: {
            setorId: true,
          },
          orderBy: {
            _count: {
              setorId: 'desc',
            },
          },
        });

    // Estatísticas por problema
    const problemData =
      type === 'internalOs'
        ? await prisma.internalOS.groupBy({
          by: ['problema'],
          _count: {
            problema: true,
          },
          orderBy: {
            _count: {
              problema: 'desc',
            },
          },
        })
        : [];

    // Retorna os dados formatados
    res.status(200).json({
      technicianData: technicianData.map((item) => ({
        label: type === 'internalOs' ? technicianMap[item.tecnicoId] || `Técnico ${item.tecnicoId}` : item.tecnicoResponsavel,
        value: item._count.tecnicoId || item._count.tecnicoResponsavel,
      })),
      schoolData: schoolData.map((item) => ({
        label: type === 'internalOs' ? sectorMap[item.setorId] || `Setor ${item.setorId}` : item.unidadeEscolar,
        value: item._count.setorId || item._count.unidadeEscolar,
      })),
      problemData: type === 'internalOs'
        ? problemData.map((item) => ({
          label: item.problema,
          value: item._count.problema,
        }))
        : [],
    });
  } catch (error) {
    console.error('Erro ao buscar estatísticas:', error);
    res.status(500).json({ error: 'Erro ao buscar estatísticas.' });
  }
}