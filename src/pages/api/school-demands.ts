import prisma from "@/utils/prisma";
import { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method === "POST") {
      const { schoolId, demand } = req.body;

      if (!schoolId || !demand) {
        return res.status(400).json({ error: "schoolId e demand são obrigatórios." });
      }

      const newDemand = await prisma.schoolDemand.create({
        data: {
          schoolId,
          demand,
          createdAt: new Date(),
        },
      });

      return res.status(201).json(newDemand);
    } else if (req.method === "PUT") {
      const { id, schoolId, demand } = req.body;

      if (!id || !schoolId || !demand) {
        return res.status(400).json({ error: "id, schoolId e demand são obrigatórios." });
      }

      // Converta o id para número
      const updatedDemand = await prisma.schoolDemand.update({
        where: { id: Number(id) }, // Certifique-se de que o id é um número
        data: {
          schoolId,
          demand,
        },
      });

      return res.status(200).json(updatedDemand);
    } else {
      return res.status(405).json({ error: "Método não permitido." });
    }
  } catch (error) {
    console.error("Erro no endpoint de demandas:", error);
    return res.status(500).json({ error: "Erro interno do servidor." });
  }
}