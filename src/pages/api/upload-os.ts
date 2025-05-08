import { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  console.log("Requisição recebida no endpoint /api/upload-os");
  console.log("Dados recebidos:", req.body);

  if (req.method === "POST") {
    console.log("Requisição recebida no endpoint /api/upload-os");
    console.log("Dados recebidos:", req.body);

    const { id, osImages, userName } = req.body;

    if (!id || !Array.isArray(osImages)) {
      return res.status(400).json({ error: "Os campos id e osImages são obrigatórios, e osImages deve ser um array." });
    }

    console.log("Buscando item com id:", id);

    try {
      console.log("Buscando item com id:", id);

      // Buscar o item existente
      const existingItem = await prisma.itemsChada.findUnique({
        where: { id: String(id) }, // Converter o `id` para String
      });

      if (!existingItem) {
        console.error("Item não encontrado na tabela ItemsChada.");
        return res.status(404).json({ error: "Item não encontrado na tabela ItemsChada." });
      }

      console.log("Item encontrado:", existingItem);

      // Criar um novo objeto de histórico
      const newHistoryEntry = {
        uploadedBy: userName || "Usuário desconhecido",
        uploadedAt: new Date().toISOString(),
        images: osImages,
      };

      // Adicionar o novo histórico ao array existente
      const updatedHistory = [...(existingItem.osImages || []), newHistoryEntry];

      // Garantir que o histórico seja serializável
      const serializedHistory = updatedHistory.map((entry) => JSON.parse(JSON.stringify(entry)));

      // Atualizar o campo osImages
      const updatedItem = await prisma.itemsChada.update({
        where: { id: String(id) }, // Converter o `id` para String
        data: { osImages: serializedHistory },
      });

      console.log("Histórico atualizado com sucesso:", updatedItem);

      return res.status(200).json({ message: "Histórico atualizado com sucesso!", updatedItem });
    } catch (error) {
      console.error("Erro ao adicionar histórico:", error);
      return res.status(500).json({ error: "Erro ao adicionar histórico." });
    }
  } else if (req.method === "PUT") {
    try {
      const newItem = await prisma.itemsChada.create({
        data: {
          itemId: req.body.itemId, // Receber o itemId dinamicamente
          problem: req.body.problem || "Problema não informado", // Valor padrão se não for fornecido
          userName: req.body.userName || "Usuário desconhecido", // Valor padrão se não for fornecido
          status: req.body.status || "PENDENTE", // Valor padrão se não for fornecido
          setor: req.body.setor || "Setor não informado", // Valor padrão se não for fornecido
          osImages: req.body.osImages || [], // Inicializar como array vazio se não for fornecido
        },
      });

      console.log("Novo item criado com sucesso:", newItem);

      return res.status(201).json({ message: "Novo item criado com sucesso!", newItem });
    } catch (error) {
      console.error("Erro ao criar novo item:", error);
      return res.status(500).json({ error: "Erro ao criar novo item." });
    }
  } else {
    return res.status(405).json({ error: "Método não permitido" });
  }
}