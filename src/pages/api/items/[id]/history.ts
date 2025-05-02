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
    const itemId = parseInt(id, 10);

    // Buscar o histórico do item na tabela ItemHistory
    const itemHistory = await prisma.itemHistory.findMany({
      where: { itemId },
      orderBy: { movedAt: 'desc' },
    });

    // Formatar o histórico do ItemHistory
    const formattedItemHistory = itemHistory.map((entry) => ({
      fromSchool: entry.fromSchool,
      toSchool: entry.toSchool,
      movedAt: entry.movedAt,
      generatedBy: entry.generatedBy || 'N/A',
    }));

    res.status(200).json(formattedItemHistory);
  } catch (error) {
    console.error('Error fetching item history:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}