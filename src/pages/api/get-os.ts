import prisma from "@/utils/prisma";
import { NextApiRequest, NextApiResponse } from "next";

export default async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    const pendentes = await prisma.os.findMany({
      where: { status: "Pendente" }
    });

    const confirmadas = await prisma.osAssinada.findMany({
      where: { status: "Confirmada" }
    });

    res.status(200).json({ pendentes, confirmadas });
  } catch (error) {
    console.error("Erro ao buscar OS:", error);
    res.status(500).json({ error: "Erro ao buscar OS" });
  }
};