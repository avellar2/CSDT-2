import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/utils/prisma';
import { requireAuth } from "@/utils/api-auth";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  // Requer autenticação
  const auth = await requireAuth(req, res);
  if (!auth) return;

  }

  try {
    // Buscar memorandos recentes e os itens relacionados
    const memorandums = await prisma.memorandum.findMany({
      take: 200,
      orderBy: { createdAt: 'desc' },
      include: {
        MemorandumItem: {
          include: {
            Item: true, // Inclui os detalhes dos itens
          },
        },
      },
    });

    res.status(200).json(memorandums);
  } catch (error) {
    console.error('Error fetching memorandums:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}