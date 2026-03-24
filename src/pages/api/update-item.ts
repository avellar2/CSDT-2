import { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "PATCH") {
    return res.status(405).json({ error: "Método não permitido" });
  }

  const { id, name, brand, serialNumber, schoolId } = req.body;

  if (!id) {
    return res.status(400).json({ error: "ID do item é obrigatório" });
  }

  try {
    const item = await prisma.item.findUnique({ where: { id: Number(id) } });
    if (!item) {
      return res.status(404).json({ error: "Item não encontrado" });
    }

    const updated = await prisma.item.update({
      where: { id: Number(id) },
      data: {
        ...(name && { name }),
        ...(brand !== undefined && { brand }),
        ...(serialNumber !== undefined && { serialNumber }),
        ...(schoolId && { schoolId: Number(schoolId) }),
      },
      include: { School: true },
    });

    return res.status(200).json(updated);
  } catch (error: any) {
    if (error.code === "P2002") {
      return res.status(400).json({ error: "Esse número de serial já existe em outro item." });
    }
    console.error("Erro ao atualizar item:", error);
    return res.status(500).json({ error: "Erro ao atualizar item" });
  }
}
