import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Buscar apenas impressoras (assumindo que têm "IMPRESSORA" no nome)
    const printers = await prisma.item.findMany({
      where: {
        name: {
          contains: 'IMPRESSORA',
          mode: 'insensitive'
        },
        status: 'DISPONIVEL' // Apenas impressoras disponíveis
      },
      include: {
        School: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: {
        name: 'asc'
      }
    });

    // Formatar dados para o react-select
    const formattedPrinters = printers.map(printer => ({
      value: printer.id,
      label: `${printer.name} - ${printer.brand} (${printer.serialNumber}) - ${printer.School?.name || 'Sem setor'}`,
      printer: {
        id: printer.id,
        name: printer.name,
        brand: printer.brand,
        serialNumber: printer.serialNumber,
        schoolId: printer.schoolId,
        schoolName: printer.School?.name
      }
    }));

    res.status(200).json(formattedPrinters);
  } catch (error) {
    console.error('Erro ao buscar impressoras:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
}