import { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient } from "@prisma/client";
import { requireAuth } from "@/utils/api-auth";

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Método não permitido" });
  // Requer autenticação
  const auth = await requireAuth(req, res);
  if (!auth) return;

  }
  try {
    const locados = await prisma.locados.findMany();
    res.status(200).json(locados);
  } catch (error) {
    res.status(500).json({ error: "Erro ao buscar itens locados" });
  }
}