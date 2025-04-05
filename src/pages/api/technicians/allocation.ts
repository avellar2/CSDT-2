import { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/utils/prisma"; // Certifique-se de que o Prisma está configurado corretamente

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Método não permitido" });
  }

  try {
    // Configuração do filtro de data
    const today = new Date();
    const startOfDay = new Date(today.setHours(0, 0, 0, 0));
    const endOfDay = new Date(today.setHours(23, 59, 59, 999));

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