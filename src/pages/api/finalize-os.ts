import { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/utils/prisma";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "PATCH") {
    return res.status(405).json({ message: "Método não permitido" });
  }

  console.log("Dados recebidos no endpoint:", req.body);

  const { osId, status, descricao } = req.body;

  if (!osId || !status || !descricao) {
    return res.status(400).json({ message: "ID da OS, status e descrição são obrigatórios" });
  }

  try {
    const updatedOS = await prisma.internalOS.update({
      where: { id: osId },
      data: { status, descricao },
    });

    res.status(200).json(updatedOS);
  } catch (error) {
    console.error("Erro ao finalizar OS:", error);
    res.status(500).json({ message: "Erro ao finalizar OS" });
  }
}