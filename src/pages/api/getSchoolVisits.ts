import { PrismaClient } from "@prisma/client";
import { NextApiRequest, NextApiResponse } from "next";

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // Buscar dados das três tabelas de OS
    const [osExterna, os, osAssinada] = await Promise.all([
      prisma.oSExterna.findMany({
        select: {
          unidadeEscolar: true,
          data: true,
          status: true
        }
      }),
      prisma.os.findMany({
        select: {
          unidadeEscolar: true,
          data: true,
          status: true
        }
      }),
      prisma.osAssinada.findMany({
        select: {
          unidadeEscolar: true,
          data: true,
          status: true
        }
      })
    ]);

    // Combinar todos os dados de OS
    const allOs = [
      ...osExterna.map(os => ({
        escola: os.unidadeEscolar,
        data: os.data,
        status: os.status,
        tipo: 'OSExterna'
      })),
      ...os.map(os => ({
        escola: os.unidadeEscolar,
        data: os.data,
        status: os.status,
        tipo: 'OS'
      })),
      ...osAssinada.map(os => ({
        escola: os.unidadeEscolar,
        data: os.data,
        status: os.status,
        tipo: 'OSAssinada'
      }))
    ];

    // Contar visitas por escola (considerando apenas OS finalizadas/assinadas)
    const schoolVisits = new Map();
    
    allOs.forEach(os => {
      if (os.escola && os.escola.trim()) {
        // Normalizar nome da escola (remover espaços extras, maiúsculas/minúsculas)
        const normalizedSchoolName = os.escola.trim();
        
        // Contar todas as OS (independente do status) como visitas realizadas
        schoolVisits.set(normalizedSchoolName, (schoolVisits.get(normalizedSchoolName) || 0) + 1);
      }
    });

    // Ordenar escolas por número de visitas
    const topVisitedSchools = Array.from(schoolVisits.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15); // Top 15 escolas mais visitadas

    // Estatísticas gerais
    const stats = {
      totalVisits: allOs.length,
      uniqueSchools: schoolVisits.size,
      avgVisitsPerSchool: Math.round((allOs.length / schoolVisits.size) * 10) / 10
    };

    res.status(200).json({
      topVisitedSchools,
      stats,
      allVisits: allOs.length
    });

  } catch (error) {
    console.error("Erro ao buscar dados de visitas às escolas:", error);
    res.status(500).json({ error: "Erro ao buscar dados de visitas às escolas" });
  } finally {
    await prisma.$disconnect();
  }
}