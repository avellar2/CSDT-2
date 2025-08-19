import prisma from "@/utils/prisma";
import { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método não permitido" });
  }

  const { demandIds } = req.body;

  if (!demandIds || !Array.isArray(demandIds)) {
    return res.status(400).json({ error: "demandIds deve ser um array" });
  }

  try {
    // Buscar demandas e suas escolas
    const demands = await prisma.schoolDemand.findMany({
      where: {
        id: { in: demandIds.map(id => Number(id)) }
      },
      include: {
        School: true
      }
    });

    // Verificar OS criadas para essas escolas
    const schoolNames = demands.map(d => d.School.name);
    
    const osCreated = await prisma.os.findMany({
      where: {
        unidadeEscolar: { in: schoolNames }
      },
      select: {
        unidadeEscolar: true,
        status: true,
        numeroOs: true
      }
    });

    // Verificar OS assinadas
    const osAssinadas = await prisma.osAssinada.findMany({
      where: {
        unidadeEscolar: { in: schoolNames }
      },
      select: {
        unidadeEscolar: true,
        numeroOs: true
      }
    });

    // Mapear status das demandas
    const demandStatus = demands.map(demand => {
      const schoolName = demand.School.name;
      const hasOs = osCreated.find(os => os.unidadeEscolar === schoolName);
      const isSigned = osAssinadas.find(os => os.unidadeEscolar === schoolName);

      return {
        demandId: demand.id,
        schoolName,
        status: isSigned ? 'signed' : hasOs ? 'created' : 'pending',
        numeroOs: hasOs?.numeroOs || isSigned?.numeroOs
      };
    });

    return res.status(200).json({ demandStatus });
  } catch (error) {
    console.error("Erro ao verificar status das OS:", error);
    return res.status(500).json({ error: "Erro interno do servidor" });
  }
}