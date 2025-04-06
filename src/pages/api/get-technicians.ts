import { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === "GET") {
    try {
      const today = new Date();
      const startOfDay = new Date(today.setHours(0, 0, 0, 0));
      const endOfDay = new Date(today.setHours(23, 59, 59, 999));

      // Busca os technicianId da tabela BaseTechnician
      const baseTechnicians = await prisma.baseTechnician.findMany({
        where: {
          createdAt: {
            gte: startOfDay,
            lte: endOfDay,
          },
        },
        select: {
          technicianId: true,
        },
      });

      // Extrai os technicianId únicos
      const technicianIds = baseTechnicians.map((bt) => bt.technicianId);

      if (technicianIds.length === 0) {
        return res.status(200).json([]); // Retorna uma lista vazia se não houver técnicos
      }

      // Busca os perfis correspondentes na tabela Profile
      const profiles = await prisma.profile.findMany({
        where: {
          id: {
            in: technicianIds,
          },
        },
        select: {
          id: true,
          displayName: true,
        },
      });

      // Mapeia os dados para retornar apenas o id e o displayName
      const result = profiles.map((profile) => ({
        id: profile.id,
        name: profile.displayName,
      }));

      res.status(200).json(result);
    } catch (error) {
      console.error("Erro ao buscar técnicos:", error);
      res.status(500).json({ error: "Erro ao buscar técnicos" });
    }
  } else {
    res.setHeader("Allow", ["GET"]);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}