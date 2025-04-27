import { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "PUT") {
    try {
      const { id, setor, tecnico, problema, descricao } = req.body;

      // Monta o objeto de atualização dinamicamente
      const updateData: any = {};
      if (setor) updateData.setorId = String(setor); // Converte para String
      if (tecnico) updateData.tecnicoId = Number(tecnico); // Converte para número
      if (problema) updateData.problema = problema;
      if (descricao !== undefined) updateData.descricao = descricao;

      await prisma.internalOS.update({
        where: { id },
        data: updateData,
      });

      res.status(200).json({ message: "OS atualizada com sucesso!" });
    } catch (error) {
      console.error("Erro ao atualizar OS:", error);
      res.status(500).json({ error: "Erro ao atualizar OS." });
    }
  } else {
    res.setHeader("Allow", ["PUT"]);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}