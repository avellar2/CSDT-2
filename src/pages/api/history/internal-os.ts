import { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/utils/prisma";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!req.query.date) {
    return res.status(400).json({ error: "Parâmetro 'date' é obrigatório" });
  }

  console.log("Parâmetro recebido:", req.query.date);

  const { date } = req.query;

  try {
    const osList = await prisma.internalOS.findMany({
      where: {
        createdAt: {
          gte: new Date(`${date}T00:00:00.000Z`),
          lt: new Date(`${date}T23:59:59.999Z`),
        },
      },
    });

    res.status(200).json(osList);
  } catch (error) {
    console.error("Erro ao buscar OS internas:", error);
    res.status(500).json({ message: "Erro ao buscar OS internas" });
  }
}