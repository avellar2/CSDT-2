import { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/utils/prisma";
import { requireAuth } from "@/utils/api-auth";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const auth = await requireAuth(req, res);
  if (!auth) return;

  try {
    const schools = await prisma.school.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        district: true,
        address: true,
        latitude: true,
        longitude: true,
        geocoded: true,
      },
      orderBy: { name: "asc" },
    });
    res.status(200).json(schools);
  } catch (error) {
    console.error("Erro ao buscar escolas:", error);
    res.status(500).json({ error: "Erro ao buscar escolas" });
  }
}
