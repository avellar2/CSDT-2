import { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método não permitido" });
  }

  const { itemId, updatedBy } = req.body;

  if (!itemId || !updatedBy) {
    return res.status(400).json({ error: "Os campos itemId e updatedBy são obrigatórios" });
  }

  try {
    // Atualizar o status e schoolId na tabela items
    await prisma.item.update({
      where: { id: Number(itemId) },
      data: {
        status: "DISPONIVEL",
        schoolId: 225, // Atualizar para o ID da escola CSDT
      },
    });

    // Atualizar o status e updatedBy na tabela itemsChada
    await prisma.itemsChada.updateMany({
      where: { itemId: Number(itemId) },
      data: {
        status: "RESOLVIDO",
        updatedBy, // Nome do usuário que deu baixa
        updatedAt: new Date(), // Atualizar a data de atualização
      },
    });

    // Inserir o histórico na tabela ItemHistory
    await prisma.itemHistory.create({
      data: {
        itemId: Number(itemId),
        fromSchool: "CHADA", // Escola de origem
        toSchool: "CSDT", // Escola de destino
        movedAt: new Date(), // Data de movimentação
        generatedBy: updatedBy, // Nome do usuário que realizou a ação
      },
    });

    res.status(200).json({ message: "Item atualizado com sucesso" });
  } catch (error) {
    console.error("Erro ao atualizar o item:", error);
    res.status(500).json({ error: "Erro ao atualizar o item" });
  }
}