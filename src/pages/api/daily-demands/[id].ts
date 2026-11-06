import prisma from "@/utils/prisma";
import { NextApiRequest, NextApiResponse } from "next";
import { requireAuth } from "@/utils/api-auth";
import { canProfileAccessDemand } from "@/utils/operationalRoutes";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;

  const auth = await requireAuth(req, res);
  if (!auth) return;

  if (req.method !== "DELETE") {
    res.setHeader("Allow", ["DELETE"]);
    return res.status(405).json({ message: "Método não permitido" });
  }

  try {
    const parsedId = typeof id === "string" ? parseInt(id, 10) : NaN;
    if (isNaN(parsedId)) {
      return res.status(400).json({ message: "ID inválido" });
    }

    const existing = await prisma.schoolDemand.findUnique({
      where: { id: parsedId },
      select: { id: true, createdAt: true, routeId: true },
    });

    if (!existing) {
      return res.status(404).json({ message: "Demanda não encontrada" });
    }

    const canAccess = await canProfileAccessDemand({
      profileId: auth.profile.id,
      role: auth.profile.role,
      demandId: existing.id,
      demandCreatedAt: existing.createdAt,
      demandRouteId: existing.routeId,
    });

    if (!canAccess) {
      return res.status(403).json({ message: "Você não tem acesso a esta demanda." });
    }

    // A OS vinculada (se existir) é preservada: apenas a demanda é removida,
    // como já ocorria antes das rotas.
    await prisma.schoolDemand.delete({
      where: { id: parsedId },
    });

    res.status(200).json({ message: "Demanda apagada com sucesso!" });
  } catch (error) {
    console.error("Erro ao apagar demanda:", error);
    res.status(500).json({ message: "Erro ao apagar demanda" });
  }
}
