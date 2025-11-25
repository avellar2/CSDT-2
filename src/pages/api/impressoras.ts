import { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Método não permitido" });
  }

  try {
    // Buscar todos os itens que são impressoras
    // Filtrando pelo nome que contém "impressora" ou "printer"
    const impressoras = await prisma.item.findMany({
      where: {
        OR: [
          { name: { contains: "impressora", mode: "insensitive" } },
          { name: { contains: "printer", mode: "insensitive" } },
          { name: { contains: "multifuncional", mode: "insensitive" } },
        ],
      },
      include: {
        School: {
          select: {
            name: true,
            inep: true,
          },
        },
        Profile: {
          select: {
            displayName: true,
          },
        },
      },
      orderBy: [
        { School: { name: "asc" } },
        { name: "asc" },
      ],
    });

    res.status(200).json(impressoras);
  } catch (error) {
    console.error("Erro ao buscar impressoras:", error);
    res.status(500).json({ error: "Erro ao buscar impressoras" });
  } finally {
    await prisma.$disconnect();
  }
}
