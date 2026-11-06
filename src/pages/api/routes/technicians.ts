import { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/utils/prisma";
import { requireRouteManager } from "@/utils/operationalRouteApi";

/**
 * Lista de perfis disponíveis para compor rotas operacionais.
 * Restrito a ADMIN/ADMTOTAL (gestão de rotas).
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const auth = await requireRouteManager(req, res);
  if (!auth) return;

  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).json({ error: "Método não permitido" });
  }

  try {
    const profiles = await prisma.profile.findMany({
      where: {
        isActive: true,
        role: { in: ["TECH", "ADMIN", "ADMTOTAL"] },
      },
      select: {
        id: true,
        displayName: true,
        role: true,
      },
      orderBy: { displayName: "asc" },
    });

    return res.status(200).json({ success: true, profiles });
  } catch (error) {
    console.error("Erro ao listar técnicos para rotas:", error);
    return res.status(500).json({ error: "Erro interno do servidor" });
  }
}
