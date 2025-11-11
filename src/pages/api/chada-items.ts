import { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient } from "@prisma/client";
import { s } from "@fullcalendar/core/internal-common";

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "GET") {
    try {
      // Buscar todos os registros da tabela ItemsChada
      const itemsChada = await prisma.itemsChada.findMany({
        orderBy: { createdAt: "desc" },
      });

      // Buscar os dados correspondentes da tabela Item
      const itemIds = itemsChada.map((chadaItem) => chadaItem.itemId);
      const items = await prisma.item.findMany({
        where: { id: { in: itemIds } },
      });

      // Combinar os dados de ItemsChada com os dados de Item
      const formattedItems = itemsChada.map((chadaItem) => {
        const item = items.find((i) => i.id === chadaItem.itemId);
        return {
          id: chadaItem.id,
          name: item?.name || "Item não encontrado",
          brand: item?.brand || "Marca não informada",
          serialNumber: item?.serialNumber || "Serial não informado",
          status: item?.status || "Status não informado",
          problem: chadaItem.problem, // Problema da tabela ItemsChada
          createdAt: chadaItem.createdAt, // Data de adição
          userName: chadaItem.userName, // Nome do usuário que adicionou
          statusChada: chadaItem.status, // Status da tabela ItemsChada
          updatedAt: chadaItem.updatedAt, // Data de atualização
          updateBy: chadaItem.updatedBy, // Nome do usuário que atualizou
          sector: chadaItem.setor, // Setor da tabela ItemsChada
          osImages: chadaItem.osImages, // Imagens da tabela ItemsChada
          numeroChadaOS: chadaItem.numeroChadaOS, // Número da OS da CHADA
          emailSentAt: chadaItem.emailSentAt, // Data/hora do envio do email
          emailMessageId: chadaItem.emailMessageId, // ID da mensagem do email
        };
      });


      res.status(200).json(formattedItems);
    } catch (error) {
      console.error("Erro ao buscar itens da CHADA:", error);
      res.status(500).json({ error: "Erro ao buscar itens da CHADA" });
    }
  } else {
    res.status(405).json({ error: "Método não permitido" });
  }
}