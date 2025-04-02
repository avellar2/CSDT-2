import { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "GET") {
    try {
      // Busca técnicos com role = TECH
      const technicians = await prisma.profile.findMany({
        where: {
          role: "TECH",
        },
        select: {
          id: true,
          displayName: true,
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