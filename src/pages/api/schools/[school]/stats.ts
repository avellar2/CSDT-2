import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/utils/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { school: schoolParam } = req.query;

  if (!schoolParam || isNaN(Number(schoolParam))) {
    return res.status(400).json({ error: 'Invalid school ID' });
  }

  try {
    const schoolId = Number(schoolParam);
    
    // Buscar escola principal e seus anexos
    const school = await prisma.school.findUnique({
      where: { id: schoolId },
      select: {
        name: true,
        other_School: {
          select: { id: true, name: true }
        }
      }
    });

    if (!school) {
      return res.status(404).json({ error: 'School not found' });
    }

    const schoolName = school.name;
    const schoolIds = [schoolId, ...(school.other_School?.map(annex => annex.id) || [])];

    // Contar OS relacionadas à escola
    const [osExternas, osAntigas, osAssinadas, internalOs, memorandos, items] = await Promise.all([
      // OS Externas (novas)
      prisma.oSExterna.count({
        where: { 
          unidadeEscolar: { 
            contains: schoolName, 
            mode: 'insensitive' 
          } 
        }
      }),
      
      // OS antigas (não assinadas)
      prisma.os.count({
        where: { 
          unidadeEscolar: { 
            contains: schoolName, 
            mode: 'insensitive' 
          } 
        }
      }),
      
      // OS Assinadas
      prisma.osAssinada.count({
        where: { 
          unidadeEscolar: { 
            contains: schoolName, 
            mode: 'insensitive' 
          } 
        }
      }),
      
      // OS Internas (verificar se há campo para escola)
      prisma.internalOS.count({
        where: { 
          setorId: { 
            contains: schoolName, 
            mode: 'insensitive' 
          } 
        }
      }),
      
      // Memorandos
      prisma.newMemorandum.count({
        where: { 
          schoolName: { 
            contains: schoolName, 
            mode: 'insensitive' 
          } 
        }
      }),
      
      // Itens cadastrados na escola principal e anexos
      prisma.item.count({
        where: { 
          schoolId: { 
            in: schoolIds 
          } 
        }
      })
    ]);

    const totalOS = osExternas + osAntigas + osAssinadas + internalOs;

    res.status(200).json({
      totalOS,
      osExternas,
      osAntigas, 
      osAssinadas,
      internalOs,
      memorandos,
      items,
      breakdown: {
        osExternas,
        osAntigas,
        osAssinadas,
        internalOs
      }
    });

  } catch (error) {
    console.error('Erro ao buscar estatísticas da escola:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
}