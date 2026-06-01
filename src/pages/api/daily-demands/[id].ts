import prisma from "@/utils/prisma";
import { NextApiRequest, NextApiResponse } from "next";
import { requireAuth } from "@/utils/api-auth";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;

  if (req.method === "DELETE") {
  // Requer autenticação
  const auth = await requireAuth(req, res);
  if (!auth) return;

    try {
      const parsedId = typeof id === "string" ? parseInt(id, 10) : NaN;
      if (isNaN(parsedId)) {
        return res.status(400).json({ message: "ID inválido" });
      }

      await prisma.schoolDemand.delete({
        where: { id: parsedId },
      });

      res.status(200).json({ message: "Demanda apagada com sucesso!" });
    } catch (error) {
      console.error("Erro ao apagar demanda:", error);
      res.status(500).json({ message: "Erro ao apagar demanda" });
    }
  } else {
    res.status(405).json({ message: "Método não permitido" });
  }
}