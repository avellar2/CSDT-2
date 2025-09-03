import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Lista de setores conhecidos (baseado nos que você mencionou)
    const knownSectors = [
      'CSDT', 'NAI', 'CAED', 'DGP', 'DJUR', 'CIE', 'CAE', 'CME', 
      'CACS FUNDEB', 'DIGITALIZAÇÃO', 'NCR', 'SUPED', 'CEI', 'DEB', 
      'DAISE', 'DAIE', 'DPPE', 'CEJA', 'CLL', 'NUMP', 'CEF I', 
      'CEF II', 'COTRAN', 'SAGP', 'ASS/SAGP', 'CAT', 'DIE', 'NF', 
      'CAESC', 'NL', 'CAPC', 'AC', 'NAA', 'EAG', 'CGP', 'GAB', 
      'SUPLAN', 'DCC', 'DCF', 'AG', 'PATRIMONIO', 'REC', 'RG', 
      'CHADA', 'OUV', 'NSGE', 'NSGE LAB', 'RPP'
    ];

    // Buscar setores no banco (schools que são setores administrativos)
    const sectorsFromDB = await prisma.school.findMany({
      where: {
        name: {
          in: knownSectors
        }
      },
      select: {
        id: true,
        name: true
      },
      orderBy: {
        name: 'asc'
      }
    });

    // Formatar para react-select
    const formattedSectors = sectorsFromDB.map(sector => ({
      value: sector.id,
      label: sector.name,
      sector: {
        id: sector.id,
        name: sector.name
      }
    }));

    // Se não encontrar setores no banco, retornar lista estática
    if (formattedSectors.length === 0) {
      const staticSectors = knownSectors.map((name, index) => ({
        value: `static_${index}`,
        label: name,
        sector: {
          id: `static_${index}`,
          name: name
        }
      }));
      
      return res.status(200).json(staticSectors);
    }

    res.status(200).json(formattedSectors);
  } catch (error) {
    console.error('Erro ao buscar setores:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
}