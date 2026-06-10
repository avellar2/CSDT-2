import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function validateApiKey(req: NextApiRequest): boolean {
  const providedKey = req.headers.authorization?.replace('Bearer ', '');
  const validKey = process.env.LOCAL_AGENT_API_KEY;
  return providedKey === validKey;
}

export default async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  if (!validateApiKey(req)) {
    return res.status(401).json({ error: 'Unauthorized - Invalid API Key' });
  }

  try {
    const printers = await prisma.printer.findMany();
    res.status(200).json(printers);
  } catch (error) {
    console.error('Erro ao buscar impressoras:', error);
    res.status(500).json({ error: 'Erro ao buscar impressoras' });
  } finally {
    await prisma.$disconnect();
  }
};
