import { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/utils/prisma";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { date } = req.query;

    if (!req.query.date) {
      return res.status(400).json({ error: "Parâmetro 'date' é obrigatório" });
    }

    console.log("Parâmetro recebido:", req.query.date);
    console.log("Data recebida no endpoint:", date);

    if (!date || isNaN(new Date(date as string).getTime())) {
      return res.status(400).json({ message: "Data inválida ou ausente" });
    }

    const demandList = await prisma.schoolDemand.findMany({
      where: {
        createdAt: {
          lte: new Date(`${date}T23:59:59.999Z`), // Inclui demandas até o final do dia fornecido
        },
      },
    });

    res.status(200).json(demandList);
  } catch (error) {
    console.error("Erro ao buscar demandas das escolas:", error);
    res.status(500).json({ message: "Erro ao buscar demandas das escolas" });
  }
}