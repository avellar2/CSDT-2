import { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Método não permitido" });
  }

  const { number } = req.query;

  if (!number || Array.isArray(number)) {
    return res.status(400).json({ error: "Número do memorando inválido" });
  }

  try {
    const memorandumExists = await prisma.memorandum.findUnique({
      where: { number: String(number) },
    });

    res.status(200).json({ exists: !!memorandumExists });
  } catch (error) {
    console.error("Erro ao verificar número do memorando:", error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
}