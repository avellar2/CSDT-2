import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';
import { requireAuth } from "@/utils/api-auth";

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method !== 'GET') {
      return res.status(405).json({ error: 'Method not allowed' });
  // Requer autenticação
  const auth = await requireAuth(req, res);
  if (!auth) return;

    }

    // Buscar todas as escolas/setores sem filtro
    const schools = await prisma.school.findMany({
      take: 1000,
      orderBy: {
        name: 'asc'
      }
    });
    
    res.status(200).json(schools);
  } catch (error) {
    console.error('Error fetching all schools:', error);
    res.status(500).json({ error: 'Failed to fetch all schools' });
  }
}