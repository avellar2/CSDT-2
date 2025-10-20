import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      error: 'Método não permitido'
    });
  }

  try {
    // Contar apenas chamados técnicos com status OPEN (Abertos)
    const technicalTicketsCount = await prisma.technicalTicket.count({
      where: {
        status: 'OPEN'
      }
    });

    // Contar apenas chamados de escala com status PENDENTE
    const chamadosEscalaCount = await prisma.chamadoEscala.count({
      where: {
        status: 'PENDENTE'
      }
    });

    // Total de chamados abertos
    const totalChamadosAbertos = technicalTicketsCount + chamadosEscalaCount;

    return res.status(200).json({
      success: true,
      data: {
        technicalTickets: technicalTicketsCount,
        chamadosEscala: chamadosEscalaCount,
        total: totalChamadosAbertos
      }
    });

  } catch (error) {
    console.error('Erro ao buscar chamados abertos:', error);
    return res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  } finally {
    await prisma.$disconnect();
  }
}
