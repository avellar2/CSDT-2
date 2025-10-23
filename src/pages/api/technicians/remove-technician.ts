import { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/utils/prisma";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "DELETE") {
    return res.status(405).json({ message: "Método não permitido" });
  }

  try {
    const { id, type } = req.body;

    if (!id || !type) {
      return res.status(400).json({ message: "ID e tipo do técnico são obrigatórios" });
    }

    // Validar o tipo
    if (!['base', 'visit', 'off'].includes(type)) {
      return res.status(400).json({ message: "Tipo inválido. Use 'base', 'visit' ou 'off'" });
    }

    // Remover o técnico da tabela apropriada
    let deleted;
    switch (type) {
      case 'base':
        deleted = await prisma.baseTechnician.delete({
          where: { id },
        });
        break;
      case 'visit':
        deleted = await prisma.visitTechnician.delete({
          where: { id },
        });
        break;
      case 'off':
        deleted = await prisma.offTechnician.delete({
          where: { id },
        });
        break;
    }

    res.status(200).json({
      success: true,
      message: "Técnico removido com sucesso",
      data: deleted,
    });
  } catch (error) {
    console.error("Erro ao remover técnico:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao remover técnico",
      error: error instanceof Error ? error.message : "Erro desconhecido",
    });
  }
}
