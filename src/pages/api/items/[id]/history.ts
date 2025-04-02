import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/utils/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { id } = req.query;

  if (!id || Array.isArray(id)) {
    return res.status(400).json({ error: 'Invalid item ID' });
  }

  try {
    // Buscar o histórico do item nas tabelas memorandum e memorandumItems
    const history = await prisma.memorandumItem.findMany({
      where: { itemId: parseInt(id, 10) },
      include: {
        memorandum: true, // Inclui os detalhes do memorando
      },
      orderBy: { createdAt: 'desc' },
    });

    // Formatar o histórico para exibição
    const formattedHistory = history.map((entry) => ({
      fromSchool: entry.memorandum.schoolName,
      toSchool: entry.memorandum.district,
      movedAt: entry.createdAt,
    }));

    res.status(200).json(formattedHistory);
  } catch (error) {
    console.error('Error fetching item history:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}