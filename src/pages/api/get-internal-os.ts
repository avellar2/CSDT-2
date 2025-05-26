import { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === "GET") {
    try {
      // 1. Busca todas as OS internas
      const internalOS = await prisma.internalOS.findMany({
        orderBy: {
          createdAt: "desc",
        },
        select: {
          id: true,
          setorId: true,
          tecnicoId: true,
          problema: true,
          status: true,
          email: true, // <-- aqui
          assinado: true,
          cpf: true,
          updatedAt: true,
        },
      });

      // 2. Extrai IDs únicos de setores e técnicos
      const setorIds = [...new Set(internalOS.map((os) => os.setorId))]
        .filter((id) => id !== null && id !== undefined && id !== "")
        .map((id) => {
          const num = Number(id);
          return isNaN(num) ? null : num;
        })
        .filter((id) => id !== null) as number[];

      const tecnicoIds = [...new Set(internalOS.map((os) => os.tecnicoId))];

      // 3. Busca informações dos setores (escolas) apenas se houver IDs válidos
      const schools =
        setorIds.length > 0
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

      // 4. Busca informações dos técnicos (profiles)
      const profiles = await prisma.profile.findMany({
        where: {
          id: { in: tecnicoIds },
        },
        select: {
          id: true,
          displayName: true,
        },
      });

      // 5. Mapeia os dados para o formato necessário
      const formattedOS = internalOS.map((os) => {
        // Converte setorId para número ou mantém null se inválido
        const setorIdNum = os.setorId ? Number(os.setorId) : null;
        const school = setorIdNum === null || isNaN(setorIdNum)
          ? null
          : schools.find((s) => s.id === setorIdNum);
        const profile = profiles.find((p) => p.id === os.tecnicoId);

        return {
          id: os.id,
          setor: school?.name || `${os.setorId}`,
          tecnico: profile?.displayName || `${os.tecnicoId}`,
          problema: os.problema,
          status: os.status,
          email: os.email || "Email não encontrado",
          updatedAt: os.updatedAt,
          assinado: os.assinado || "Não assinado",
          cpf: os.cpf || "CPF não informado",
        };
      });

      res.status(200).json(formattedOS);
    } catch (error) {
      console.error("Erro ao buscar OS:", error);
      res.status(500).json({ error: "Erro ao buscar OS." });
    }
  } else {
    res.setHeader("Allow", ["GET"]);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}