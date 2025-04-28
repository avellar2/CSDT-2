import prisma from "@/utils/prisma";
import { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Método não permitido" });
  }

  const { numeroOs } = req.query;

  if (!numeroOs) {
    return res.status(400).json({ error: "Número de OS não fornecido" });
  }

  try {
    const existingOs = await prisma.os.findUnique({
      where: { numeroOs: String(numeroOs) },
    });

    if (existingOs) {
      return res.status(200).json({ exists: true });
    }

    return res.status(200).json({ exists: false });
  } catch (error) {
    console.error("Erro ao verificar número de OS:", error);
    return res.status(500).json({ error: "Erro interno do servidor" });
  }
}