import prisma from "@/utils/prisma";
import { NextApiRequest, NextApiResponse } from "next";

export default async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method === "GET") {
    try {
      const osAssinadas = await prisma.osAssinada.findMany();
      res.status(200).json(osAssinadas);
    } catch (error) {
      res.status(500).send("Erro ao buscar OS assinadas");
    }
  } else {
    res.status(405).send("Método não permitido");
  }
};