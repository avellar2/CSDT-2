import { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método não permitido" });
  }

  const { itemId, resolvedBy, resolvedAt, images } = req.body;

  if (!itemId || !resolvedBy || !resolvedAt || !Array.isArray(images)) {
    return res.status(400).json({
      error: "Os campos itemId, resolvedBy, resolvedAt e images são obrigatórios, e images deve ser um array.",
    });
  }

  try {
    // Criar uma nova entrada no histórico
    const historyItem = await prisma.itemsHistoryChada.create({
      data: {
        itemId,
        resolvedBy,
        resolvedAt: new Date(resolvedAt),
        images
        // images field removed as it does not exist in the Prisma schema
      },
    });

    return res.status(200).json({ message: "Histórico criado com sucesso!", historyItem });
  } catch (error) {
    console.error("Erro ao criar histórico:", error);
    return res.status(500).json({ error: "Erro ao criar histórico." });
  }
}