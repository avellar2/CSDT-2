import { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método não permitido" });
  }

  const { userId } = req.body;

  if (!userId) {
    return res.status(400).json({ error: "O campo userId é obrigatório" });
  }

  try {
    // Buscar o displayName com base no userId
    const profile = await prisma.profile.findUnique({
      where: { userId },
    });

    if (!profile) {
      return res.status(404).json({ error: "Usuário não encontrado" });
    }

    res.status(200).json({ displayName: profile.displayName });
  } catch (error) {
    console.error("Erro ao buscar displayName:", error);
    res.status(500).json({ error: "Erro ao buscar displayName" });
  }
}