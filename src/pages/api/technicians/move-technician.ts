import { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/utils/prisma";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Método não permitido" });
  }

  try {
    const { id, fromType, toType } = req.body;

    if (!id || !fromType || !toType) {
      return res.status(400).json({
        message: "ID, tipo de origem e tipo de destino são obrigatórios"
      });
    }

    // Validar os tipos
    const validTypes = ['base', 'visit', 'off'];
    if (!validTypes.includes(fromType) || !validTypes.includes(toType)) {
      return res.status(400).json({
        message: "Tipo inválido. Use 'base', 'visit' ou 'off'"
      });
    }

    if (fromType === toType) {
      return res.status(400).json({
        message: "Tipo de origem e destino não podem ser iguais"
      });
    }

    // Buscar o técnico na tabela de origem
    let technician: any;
    switch (fromType) {
      case 'base':
        technician = await prisma.baseTechnician.findUnique({ where: { id } });
        break;
      case 'visit':
        technician = await prisma.visitTechnician.findUnique({ where: { id } });
        break;
      case 'off':
        technician = await prisma.offTechnician.findUnique({ where: { id } });
        break;
    }

    if (!technician) {
      return res.status(404).json({
        message: "Técnico não encontrado na categoria de origem"
      });
    }

    // Usar uma transação para garantir consistência
    const result = await prisma.$transaction(async (tx) => {
      // Criar na nova tabela
      let created;
      switch (toType) {
        case 'base':
          created = await tx.baseTechnician.create({
            data: {
              technicianId: technician.technicianId,
            },
          });
          break;
        case 'visit':
          created = await tx.visitTechnician.create({
            data: {
              technicianId: technician.technicianId,
            },
          });
          break;
        case 'off':
          created = await tx.offTechnician.create({
            data: {
              technicianId: technician.technicianId,
            },
          });
          break;
      }

      // Remover da tabela antiga
      switch (fromType) {
        case 'base':
          await tx.baseTechnician.delete({ where: { id } });
          break;
        case 'visit':
          await tx.visitTechnician.delete({ where: { id } });
          break;
        case 'off':
          await tx.offTechnician.delete({ where: { id } });
          break;
      }

      return created;
    });

    res.status(200).json({
      success: true,
      message: "Técnico movido com sucesso",
      data: result,
    });
  } catch (error) {
    console.error("Erro ao mover técnico:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao mover técnico",
      error: error instanceof Error ? error.message : "Erro desconhecido",
    });
  }
}
