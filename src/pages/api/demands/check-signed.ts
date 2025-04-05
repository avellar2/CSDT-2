import { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const { schoolNames } = req.body;

    if (!schoolNames || !Array.isArray(schoolNames)) {
      return res.status(400).json({ message: "schoolNames array is required" });
    }

    const today = new Date();
    const todayString = today.toISOString().split("T")[0]; // Formato YYYY-MM-DD

    const signedOrders = await prisma.osAssinada.findMany({
      where: {
        unidadeEscolar: {
          in: schoolNames,
        },
        data: {
          equals: todayString, // Usando equals pois data é string
        },
      },
      select: {
        unidadeEscolar: true, // Usando unidadeEscolar em vez de escola
      },
    });

    res.status(200).json({
      signedSchools: signedOrders.map((order) => order.unidadeEscolar), // Mapeando para unidadeEscolar
    });
  } catch (error) {
    console.error("Error checking signed orders:", error);
    res.status(500).json({ message: "Internal server error" });
  } finally {
    await prisma.$disconnect();
  }
}