import { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  console.log("Requisição recebida no endpoint /api/upload-os");
  console.log("Dados recebidos:", req.body);

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método não permitido" });
  }

  const { itemId, osImages } = req.body;

  if (!itemId || !Array.isArray(osImages)) {
    return res.status(400).json({ error: "Os campos itemId e osImages são obrigatórios, e osImages deve ser um array." });
  }

  try {
    console.log("Buscando item com itemId:", itemId);

    // Buscar o item existente
    const existingItem = await prisma.itemsChada.findUnique({
      where: { itemId: Number(itemId) },
    });

    if (!existingItem) {
      console.error("Item não encontrado na tabela ItemsChada.");
      return res.status(404).json({ error: "Item não encontrado na tabela ItemsChada." });
    }

    console.log("Item encontrado:", existingItem);

    // Concatenar as novas imagens com as existentes
    const updatedImages = [...(existingItem.osImages || []), ...osImages];

    // Atualizar o campo osImages
    const updatedItem = await prisma.itemsChada.update({
      where: { itemId: Number(itemId) },
      data: { osImages: updatedImages },
    });

    console.log("Imagens atualizadas com sucesso:", updatedItem);

    return res.status(200).json({ message: "Imagens adicionadas com sucesso!", updatedItem });
  } catch (error) {
    console.error("Erro ao adicionar imagens:", error);
    return res.status(500).json({ error: "Erro ao adicionar imagens." });
  }
}