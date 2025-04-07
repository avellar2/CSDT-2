import { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/utils/prisma";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { date } = req.query;

  if (!date) {
    return res.status(400).json({ message: "A data é obrigatória" });
  }

  try {
    const demandList = await prisma.schoolDemand.findMany({
      where: {
        createdAt: {
          gte: new Date(`${date}T00:00:00.000Z`),
          lt: new Date(`${date}T23:59:59.999Z`),
        },
      },
    });

    res.status(200).json(demandList);
  } catch (error) {
    console.error("Erro ao buscar demandas das escolas:", error);
    res.status(500).json({ message: "Erro ao buscar demandas das escolas" });
  }
}