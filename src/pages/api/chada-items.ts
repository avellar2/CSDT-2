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
      const itemIds = itemsChada.map((chadaItem) => chadaItem.itemId).filter((id): id is number => id !== null);
      const items = await prisma.item.findMany({
        where: { id: { in: itemIds } },
      });

      // Combinar os dados de ItemsChada com os dados de Item
      const formattedItems = itemsChada.map((chadaItem) => {
        const item = items.find((i) => i.id === chadaItem.itemId);
        return {
          id: chadaItem.id,
          name: chadaItem.semSerial
            ? (chadaItem.itemTypeSemSerial || "Item sem serial")
            : item?.name || "Item não encontrado",
          brand: chadaItem.semSerial
            ? [chadaItem.itemBrandSemSerial, chadaItem.itemNameSemSerial].filter(Boolean).join(" ")
            : item?.brand || "Marca não informada",
          serialNumber: chadaItem.semSerial ? "SEM SERIAL" : item?.serialNumber || "Serial não informado",
          status: item?.status || "Status não informado",
          problem: chadaItem.problem,
          createdAt: chadaItem.createdAt,
          userName: chadaItem.userName,
          statusChada: chadaItem.status,
          updatedAt: chadaItem.updatedAt,
          updateBy: chadaItem.updatedBy,
          sector: chadaItem.setor,
          osImages: chadaItem.osImages,
          numeroChadaOS: chadaItem.numeroChadaOS,
          emailSentAt: chadaItem.emailSentAt,
          emailMessageId: chadaItem.emailMessageId,
          semSerial: chadaItem.semSerial,
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