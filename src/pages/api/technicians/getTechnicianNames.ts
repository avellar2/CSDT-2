import { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/utils/prisma";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Método não permitido" });
  }

  const { technicianIds } = req.body;

  if (!technicianIds || !Array.isArray(technicianIds)) {
    return res.status(400).json({ message: "IDs dos técnicos são obrigatórios e devem ser um array" });
  }

  try {
    // Converter os IDs para string (caso estejam como números)
    const numberIds = technicianIds.map((id) => Number(id));

    // Buscar os nomes dos técnicos na tabela profile
    const technicians = await prisma.profile.findMany({
      where: {
        id: { in: numberIds },
      },
      select: {
        id: true,
        displayName: true,
      },
    });

    res.status(200).json(technicians);
  } catch (error) {
    console.error("Erro ao buscar técnicos:", error);
    res.status(500).json({ message: "Erro ao buscar técnicos" });
  }
}