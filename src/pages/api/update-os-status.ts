import { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/utils/prisma";
import { requireAuth } from "@/utils/api-auth";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Autenticação antes do processamento (antes estava em código inacessível).
  const auth = await requireAuth(req, res);
  if (!auth) return;

  if (req.method !== "PATCH") {
    return res.status(405).json({ message: "Método não permitido" });
  }

  const { osId, status } = req.body;

  if (!osId || !status) {
    return res.status(400).json({ message: "ID da OS e status são obrigatórios" });
  }

  try {
    const updatedOS = await prisma.internalOS.update({
      where: { id: osId },
      data: { status },
    });

    res.status(200).json(updatedOS);
  } catch (error) {
    console.error("Erro ao atualizar status da OS:", error);
    res.status(500).json({ message: "Erro ao atualizar status da OS" });
  }
}