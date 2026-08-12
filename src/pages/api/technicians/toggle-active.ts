import { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/utils/prisma";
import { requireRole, AUTH_ROLES } from "@/utils/api-auth";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "PATCH") {
    res.setHeader("Allow", ["PATCH"]);
    return res.status(405).json({ error: "Method not allowed" });
  }

  const auth = await requireRole(req, res, [AUTH_ROLES.ADMIN, AUTH_ROLES.ADMTOTAL]);
  if (!auth) return;

  const { id, isActive } = req.body;

  if (typeof id !== "number" && !Number.isInteger(Number(id))) {
    return res.status(400).json({ error: "ID do técnico inválido" });
  }

  if (typeof isActive !== "boolean") {
    return res.status(400).json({ error: "isActive deve ser booleano" });
  }

  try {
    const technician = await prisma.profile.updateMany({
      where: {
        id: Number(id),
        role: "TECH",
      },
      data: { isActive },
    });

    if (technician.count === 0) {
      return res.status(404).json({ error: "Técnico não encontrado" });
    }

    res.status(200).json({ success: true, isActive });
  } catch (error) {
    console.error("Erro ao atualizar status do técnico:", error);
    res.status(500).json({ error: "Erro ao atualizar status do técnico" });
  }
}
