import { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === "GET") {
    try {
      const schools = await prisma.school.findMany({
        select: { id: true, name: true, email: true, district: true },
      });
      res.status(200).json(schools);
    } catch (error) {
      console.error("Erro ao buscar escolas:", error);
      res.status(500).json({ error: "Erro ao buscar escolas" });
    }
  } else {
    res.setHeader("Allow", ["GET"]);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}