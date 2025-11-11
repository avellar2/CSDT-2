import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  const { school: id } = req.query;

  if (!id || isNaN(Number(id))) {
    return res.status(400).json({ error: 'ID inválido' });
  }

  try {
    // Buscar a escola principal e seus anexos
    const school = await prisma.school.findUnique({
      where: { id: Number(id) },
      include: {
        other_School: true // Incluir anexos
      }
    });

    if (!school) {
      return res.status(404).json({ error: 'Escola não encontrada' });
    }

    // IDs da escola principal + anexos
    const schoolIds = [school.id, ...(school.other_School?.map(annex => annex.id) || [])];

    // Buscar itens da escola principal e de todos os anexos
    const items = await prisma.item.findMany({
      where: { 
        schoolId: {
          in: schoolIds
        }
      },
      include: {
        School: true // Incluir dados da escola para identificação
      },
      orderBy: { createdAt: 'desc' },
    });

    // Serializar os campos de data e adicionar informação da escola de origem
    const serializedItems = items.map((item) => {
      const isMainSchool = item.School?.id === school.id;
      const isAnnex = item.School?.parentSchoolId !== null;
      
      return {
        ...item,
        createdAt: item.createdAt.toISOString(),
        updatedAt: item.updatedAt.toISOString(),
        school: item.School ? {
          id: item.School.id,
          name: item.School.name,
          isAnnex: isAnnex,
          isMainSchool: isMainSchool
        } : null
      };
    });

    return res.status(200).json(serializedItems);
  } catch (error) {
    console.error('Erro ao buscar itens:', error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
}