import { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "PATCH") {
    return res.status(405).json({ error: "Método não permitido" });
  }

  const { id, images } = req.body;

  if (!id || !Array.isArray(images)) {
    return res.status(400).json({ error: "Os campos id e images são obrigatórios, e images deve ser um array." });
  }

  try {
    console.log("ID recebido:", id);

    // Verificar se o registro existe
    let existingHistory = await prisma.itemsHistoryChada.findUnique({
      where: { id: Number(id) },
    });

    console.log("Resultado da consulta:", existingHistory);

    if (!existingHistory) {
      console.log("Criando novo registro para id:", id);

      existingHistory = await prisma.itemsHistoryChada.create({
        data: {
          id: Number(id),
          itemId: 0, // Substitua por um valor válido
          resolvedBy: "Usuário desconhecido", // Substitua por um valor válido
          resolvedAt: new Date(),
          images: [],
        },
      });

      console.log("Novo registro criado:", existingHistory);
    }

    // Atualizar o campo images na tabela ItemsHistoryChada
    const updatedHistory = await prisma.itemsHistoryChada.update({
      where: { id: Number(id) },
      data: { images },
    });

    return res.status(200).json({ message: "Imagens enviadas com sucesso!", updatedHistory });
  } catch (error) {
    console.error("Erro ao atualizar o histórico:", error);
    return res.status(500).json({ error: "Erro ao atualizar o histórico." });
  }
}