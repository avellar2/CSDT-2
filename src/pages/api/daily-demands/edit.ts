import prisma from "@/utils/prisma";
import { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "PUT") {
    const { id, title, description } = req.body;

    try {
      const updatedDemand = await prisma.schoolDemand.update({
        where: { id: parseInt(id, 10) }, // Converte o id para Int
        data: {
          demand: title, // Certifique-se de que o campo corresponde ao seu modelo Prisma
        },
      });

      res.status(200).json(updatedDemand);
    } catch (error) {
      console.error("Erro ao editar demanda:", error);
      res.status(500).json({ message: "Erro ao editar demanda" });
    }
  } else {
    res.status(405).json({ message: "Método não permitido" });
  }
}