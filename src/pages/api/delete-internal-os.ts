import { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "DELETE") {
    try {
      const { id } = req.body;
      await prisma.internalOS.delete({
        where: { id },
      });
      res.status(200).json({ message: "OS excluída com sucesso!" });
    } catch (error) {
      console.error("Erro ao excluir OS:", error);
      res.status(500).json({ error: "Erro ao excluir OS." });
    }
  } else {
    res.setHeader("Allow", ["DELETE"]);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}