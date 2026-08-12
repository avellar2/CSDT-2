import { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/utils/prisma";
import { requireRole, AUTH_ROLES } from "@/utils/api-auth";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).json({ error: "Method not allowed" });
  }

  const auth = await requireRole(req, res, [AUTH_ROLES.ADMIN, AUTH_ROLES.ADMTOTAL]);
  if (!auth) return;

  try {
    const technicians = await prisma.profile.findMany({
      where: { role: "TECH" },
      select: {
        id: true,
        displayName: true,
        isActive: true,
      },
      orderBy: { displayName: "asc" },
    });

    res.status(200).json(technicians);
  } catch (error) {
    console.error("Erro ao listar técnicos:", error);
    res.status(500).json({ error: "Erro ao listar técnicos" });
  }
}
