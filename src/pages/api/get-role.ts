import { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/utils/prisma";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Método não permitido" });
  }

  const { userId } = req.query;

  if (!userId) {
    return res.status(400).json({ error: "ID do usuário não fornecido" });
  }

  try {
    // Busca o perfil do usuário na tabela profile usando o userId do Supabase
    const profile = await prisma.profile.findUnique({
      where: { userId: userId as string }, // Assume que 'userId' na tabela é o mesmo do Supabase
      select: { role: true },
    });

    if (!profile) {
      return res.status(404).json({ error: "Perfil não encontrado" });
    }

    res.status(200).json({ role: profile.role });
  } catch (error) {
    console.error("Erro ao buscar role:", error);
    res.status(500).json({ error: "Erro ao buscar role" });
  }
}