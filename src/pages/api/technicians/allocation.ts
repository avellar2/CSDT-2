import { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/utils/prisma"; // Certifique-se de que o Prisma está configurado corretamente

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Método não permitido" });
  }

  try {
    // Aceitar data como parâmetro de query, senão usar hoje
    const { date } = req.query;
    
    // Função auxiliar para criar data no fuso horário brasileiro
    const createBrazilianDate = (dateString?: string) => {
      if (dateString) {
        // Para data específica, criar no fuso horário local brasileiro
        const targetDate = new Date(dateString + 'T00:00:00-03:00');
        return new Date(targetDate.getTime());
      } else {
        // Para "hoje", usar a data atual no fuso brasileiro
        const now = new Date();
        // Ajustar para fuso horário brasileiro (UTC-3)
        const brazilTime = new Date(now.getTime() - (3 * 60 * 60 * 1000));
        return new Date(brazilTime.toISOString().split('T')[0] + 'T00:00:00-03:00');
      }
    };
    
    // Configuração do filtro de data
    const targetDate = createBrazilianDate(date as string);
    const startOfDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 0, 0, 0, 0);
    const endOfDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 23, 59, 59, 999);

    // Buscar técnicos na base
    const baseTechnicians = await prisma.baseTechnician.findMany({
      where: {
        createdAt: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      select: {
        id: true,
        technicianId: true,
        createdAt: true,
      },
    });

    // Buscar técnicos em visita técnica
    const visitTechnicians = await prisma.visitTechnician.findMany({
      where: {
        createdAt: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      select: {
        id: true,
        technicianId: true,
        createdAt: true,
      },
    });

    // Buscar técnicos de folga
    const offTechnicians = await prisma.offTechnician.findMany({
      where: {
        createdAt: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      select: {
        id: true,
        technicianId: true,
        createdAt: true,
      },
    });

    // Retornar os dados filtrados
    res.status(200).json({
      baseTechnicians,
      visitTechnicians,
      offTechnicians,
    });
  } catch (error) {
    console.error("Erro ao buscar técnicos:", error);
    res.status(500).json({ message: "Erro ao buscar técnicos" });
  }
}