import { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient } from "@prisma/client";
import { requireAuth } from "@/utils/api-auth";

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "GET") {
  // Requer autenticação
  const auth = await requireAuth(req, res);
  if (!auth) return;

    try {
      // Busca técnicos ativos com role = TECH
      const technicians = await prisma.profile.findMany({
        where: {
          role: "TECH",
          isActive: true,
        },
        select: {
          id: true,
          displayName: true,
          isActive: true,
        },
      });

      res.status(200).json(technicians);
    } catch (error) {
      console.error("Erro ao buscar técnicos:", error);
      res.status(500).json({ error: "Erro ao buscar técnicos" });
    }
  } else {
    res.setHeader("Allow", ["GET"]);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}