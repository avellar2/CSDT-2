import { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "GET") {
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({ error: "O parâmetro 'userId' é obrigatório." });
    }

    try {
      const profile = await prisma.profile.findUnique({
        where: { userId: userId as string },
        select: {
          id: true,
          displayName: true,
          role: true,
          schoolId: true,
        },
      });

      if (!profile) {
        return res.status(404).json({ error: "Perfil não encontrado." });
      }

      res.status(200).json(profile);
    } catch (error) {
      console.error("Erro ao buscar perfil:", error);
      res.status(500).json({ error: "Erro ao buscar perfil." });
    } finally {
      await prisma.$disconnect();
    }
  } else {
    res.setHeader("Allow", ["GET"]);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}