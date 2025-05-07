import { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "PATCH") {
    return res.status(405).json({ error: "Método não permitido" });
  }

  const { itemId, status } = req.body;

  if (!itemId || !status) {
    return res.status(400).json({ error: "Os campos itemId e status são obrigatórios." });
  }

  try {
    console.log("Atualizando itemId:", itemId);

    // Verificar se o registro existe
    const existingItem = await prisma.itemsChada.findMany({
      where: { itemId: Number(itemId) },
    });

    if (!existingItem) {
      console.error("Registro não encontrado para itemId:", itemId);
      return res.status(404).json({ error: "Registro não encontrado na tabela ItemsChada." });
    }

    // Atualizar o status do item
    const updatedItem = await prisma.itemsChada.updateMany({
      where: { itemId: Number(itemId) },
      data: { status },
    });

    if (updatedItem.count === 0) {
      console.error("Nenhum registro encontrado para itemId:", itemId);
      return res.status(404).json({ error: "Registro não encontrado na tabela ItemsChada." });
    }

    return res.status(200).json({ message: "Status atualizado com sucesso!", updatedItem });
  } catch (error) {
    console.error("Erro ao atualizar o status do item:", error);
    return res.status(500).json({ error: "Erro ao atualizar o status do item." });
  }
}