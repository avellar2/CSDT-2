import { PrismaClient } from "@prisma/client";
import { NextApiRequest, NextApiResponse } from "next";

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { baseTechnicians, visitTechnicians, offTechnicians, schoolDemands } = req.body;

  try {
    // Converter strings para números e salvar técnicos de base
    await prisma.baseTechnician.createMany({
      data: baseTechnicians.map((technicianId: string) => ({
        technicianId: parseInt(technicianId)
      })),
      skipDuplicates: true // Evitar duplicações
    });

    // Converter strings para números e salvar técnicos de visita técnica
    await prisma.visitTechnician.createMany({
      data: visitTechnicians.map((technicianId: string) => ({
        technicianId: parseInt(technicianId)
      })),
      skipDuplicates: true
    });

    // Converter strings para números e salvar técnicos de folga
    await prisma.offTechnician.createMany({
      data: offTechnicians.map((technicianId: string) => ({
        technicianId: parseInt(technicianId)
      })),
      skipDuplicates: true
    });

    // Salvar demandas das escolas (já está correto)
    await prisma.schoolDemand.createMany({
      data: Object.entries(schoolDemands).map(([schoolId, demand]) => ({
        schoolId: parseInt(schoolId),
        demand: demand as string,
      })),
      skipDuplicates: true
    });

    res.status(200).json({ message: "Escala salva com sucesso!" });
  } catch (error) {
    console.error("Erro ao salvar escala:", error);
    res.status(500).json({ error: "Erro ao salvar escala" });
  } finally {
    await prisma.$disconnect();
  }
}