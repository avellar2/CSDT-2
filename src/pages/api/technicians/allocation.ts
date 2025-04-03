import { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/utils/prisma"; // Certifique-se de que o Prisma está configurado corretamente

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Método não permitido" });
  }

  try {
    // Buscar técnicos na base
    const baseTechnicians = await prisma.baseTechnician.findMany({
      select: {
        id: true,
        technicianId: true,
        createdAt: true,
      },
    });

    // Buscar técnicos em visita técnica
    const visitTechnicians = await prisma.visitTechnician.findMany({
      select: {
        id: true,
        technicianId: true,
        createdAt: true,
      },
    });

    // Buscar técnicos de folga
    const offTechnicians = await prisma.offTechnician.findMany({
      select: {
        id: true,
        technicianId: true,
        createdAt: true,
      },
    });

    // Retornar os dados
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