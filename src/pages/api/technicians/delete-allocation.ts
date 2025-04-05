import { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/utils/prisma";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "DELETE") {
    return res.status(405).json({ message: "Método não permitido" });
  }

  try {
    const today = new Date();
    const startOfDay = new Date(today.setHours(0, 0, 0, 0));
    const endOfDay = new Date(today.setHours(23, 59, 59, 999));

    // Deletar todos os técnicos alocados hoje
    await prisma.$transaction([
      prisma.baseTechnician.deleteMany({
        where: { createdAt: { gte: startOfDay, lte: endOfDay } },
      }),
      prisma.visitTechnician.deleteMany({
        where: { createdAt: { gte: startOfDay, lte: endOfDay } },
      }),
      prisma.offTechnician.deleteMany({
        where: { createdAt: { gte: startOfDay, lte: endOfDay } },
      }),
    ]);

    res.status(200).json({
      success: true,
      message: "Escala do dia apagada com sucesso",
    });
  } catch (error) {
    console.error("Erro ao apagar escala:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao apagar escala",
    });
  }
}