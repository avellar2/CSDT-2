import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/utils/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Buscar todos os memorandos e os itens relacionados
    const memorandums = await prisma.memorandum.findMany({
      include: {
        items: {
          include: {
            item: true, // Inclui os detalhes dos itens
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