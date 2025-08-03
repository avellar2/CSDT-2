import { PrismaClient } from "@prisma/client";
import { NextApiRequest, NextApiResponse } from "next";

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // Buscar todas as escalas agrupadas por data
    const [baseTechnicians, visitTechnicians, offTechnicians, schoolDemands, techniciansData] = await Promise.all([
      prisma.baseTechnician.findMany({
        orderBy: { createdAt: 'desc' }
      }),
      prisma.visitTechnician.findMany({
        orderBy: { createdAt: 'desc' }
      }),
      prisma.offTechnician.findMany({
        orderBy: { createdAt: 'desc' }
      }),
      prisma.schoolDemand.findMany({
        include: {
          School: {
            select: {
              name: true,
              district: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.profile.findMany({
        select: {
          id: true,
          userId: true,
          displayName: true
        }
      })
    ]);


    // Agrupar por data (dia)
    const scalesByDate = new Map();

    // Processar técnicos de base
    baseTechnicians.forEach(tech => {
      const dateKey = tech.createdAt.toISOString().split('T')[0];
      if (!scalesByDate.has(dateKey)) {
        scalesByDate.set(dateKey, {
          date: dateKey,
          createdAt: tech.createdAt,
          baseTechnicians: [],
          visitTechnicians: [],
          offTechnicians: [],
          schoolDemands: []
        });
      }
      scalesByDate.get(dateKey).baseTechnicians.push(tech);
    });

    // Processar técnicos de visita
    visitTechnicians.forEach(tech => {
      const dateKey = tech.createdAt.toISOString().split('T')[0];
      if (!scalesByDate.has(dateKey)) {
        scalesByDate.set(dateKey, {
          date: dateKey,
          createdAt: tech.createdAt,
          baseTechnicians: [],
          visitTechnicians: [],
          offTechnicians: [],
          schoolDemands: []
        });
      }
      scalesByDate.get(dateKey).visitTechnicians.push(tech);
    });

    // Processar técnicos de folga
    offTechnicians.forEach(tech => {
      const dateKey = tech.createdAt.toISOString().split('T')[0];
      if (!scalesByDate.has(dateKey)) {
        scalesByDate.set(dateKey, {
          date: dateKey,
          createdAt: tech.createdAt,
          baseTechnicians: [],
          visitTechnicians: [],
          offTechnicians: [],
          schoolDemands: []
        });
      }
      scalesByDate.get(dateKey).offTechnicians.push(tech);
    });

    // Processar demandas das escolas
    schoolDemands.forEach(demand => {
      const dateKey = demand.createdAt.toISOString().split('T')[0];
      if (!scalesByDate.has(dateKey)) {
        scalesByDate.set(dateKey, {
          date: dateKey,
          createdAt: demand.createdAt,
          baseTechnicians: [],
          visitTechnicians: [],
          offTechnicians: [],
          schoolDemands: []
        });
      }
      scalesByDate.get(dateKey).schoolDemands.push(demand);
    });

    // Converter Map para Array e ordenar por data
    const scales = Array.from(scalesByDate.values())
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .map(scale => {
        // Enriquecer com dados dos técnicos
        const enrichScale = {
          ...scale,
          baseTechnicians: scale.baseTechnicians.map((tech: any) => {
            const technicianData = techniciansData.find(t => t.id === tech.technicianId);
            return {
              ...tech,
              displayName: technicianData?.displayName || `Técnico ${tech.technicianId}`
            };
          }),
          visitTechnicians: scale.visitTechnicians.map((tech: any) => {
            const technicianData = techniciansData.find(t => t.id === tech.technicianId);
            return {
              ...tech,
              displayName: technicianData?.displayName || `Técnico ${tech.technicianId}`
            };
          }),
          offTechnicians: scale.offTechnicians.map((tech: any) => {
            const technicianData = techniciansData.find(t => t.id === tech.technicianId);
            return {
              ...tech,
              displayName: technicianData?.displayName || `Técnico ${tech.technicianId}`
            };
          }),
          totalTechnicians: scale.baseTechnicians.length + scale.visitTechnicians.length + scale.offTechnicians.length,
          totalSchools: scale.schoolDemands.length
        };

        return enrichScale;
      });

    res.status(200).json(scales);
  } catch (error) {
    console.error("Erro ao buscar histórico de escalas:", error);
    res.status(500).json({ error: "Erro ao buscar histórico de escalas" });
  } finally {
    await prisma.$disconnect();
  }
}