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
      // 1. Busca o perfil do técnico na tabela Profile usando o userId
      const profile = await prisma.profile.findUnique({
        where: { userId: userId as string },
        select: { id: true, displayName: true },
      });

      if (!profile) {
        return res.status(404).json({ error: "Perfil do técnico não encontrado." });
      }

      // 2. Busca as OS internas na tabela InternalOS associadas ao tecnicoId
      const internalOS = await prisma.internalOS.findMany({
        where: {
          tecnicoId: profile.id,
        },
        orderBy: {
          updatedAt: "desc",
        },
      });

      if (internalOS.length === 0) {
        return res.status(200).json([]); // Retorna vazio se não houver OS
      }

      // 3. Busca informações dos setores (escolas)
      const setorIds = [...new Set(internalOS.map((os) => os.setorId))]
        .filter((id) => id !== null && id !== undefined && id !== "")
        .map((id) => {
          const num = Number(id);
          return isNaN(num) ? null : num;
        })
        .filter((id) => id !== null) as number[];

      const schools = setorIds.length > 0
        ? await prisma.school.findMany({
          where: {
            id: { in: setorIds },
          },
          select: {
            id: true,
            name: true,
          },
        })
        : [];

      // 4. Mapeia os dados para o formato necessário
      const formattedOS = internalOS.map((os) => {
        const setorIdNum = os.setorId ? Number(os.setorId) : null;
        const school = setorIdNum !== null && !isNaN(setorIdNum) ? schools.find((s) => s.id === setorIdNum) : null;

        return {
          id: os.id,
          setor: school?.name || `Setor ID: ${os.setorId}`,
          tecnico: profile.displayName, // Usa o displayName do técnico
          problema: os.problema,
          status: os.status,
          updatedAt: os.updatedAt,
        };
      });

      res.status(200).json(formattedOS);
    } catch (error) {
      console.error("Erro ao buscar OS internas:", error);
      res.status(500).json({ error: "Erro ao buscar OS internas." });
    } finally {
      await prisma.$disconnect();
    }
  } else {
    res.setHeader("Allow", ["GET"]);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}