import { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método não permitido" });
  }

  const { itemId, problem, userName, sector } = req.body;

  if (!itemId || !problem || !userName || !sector) {
    return res.status(400).json({ error: "Todos os campos são obrigatórios" });
  }

  try {
    // Buscar o item atual para obter o nome da escola atual
    const item = await prisma.item.findUnique({
      where: { id: Number(itemId) },
      include: { School: true }, // Inclui os dados da escola atual
    });

    if (!item) {
      return res.status(404).json({ error: "Item não encontrado" });
    }

    const fromSchool = item.School?.name || "Escola desconhecida";
    const toSchool = "CHADA"; // Nome da escola de destino

    // Adicionar o item à tabela ItemsChada
    await prisma.itemsChada.create({
      data: {
        itemId: Number(itemId),
        problem,
        userName,
        setor: sector, // Adiciona o setor à tabela ItemsChada
      },
    });

    // Atualizar o status e o schoolId do item na tabela Item
    await prisma.item.update({
      where: { id: Number(itemId) },
      data: {
        status: "CHADA",
        schoolId: 259, // Atualizar o schoolId para 259 (referente à CHADA)
      },
    });

    // Registrar a movimentação na tabela ItemHistory
    await prisma.itemHistory.create({
      data: {
        itemId: Number(itemId),
        fromSchool,
        toSchool,
        generatedBy: userName,
      },
    });

    res.status(200).json({ message: "Item adicionado à CHADA com sucesso" });
  } catch (error) {
    console.error("Erro ao adicionar item à CHADA:", error);
    res.status(500).json({ error: "Erro ao adicionar item à CHADA" });
  }
}