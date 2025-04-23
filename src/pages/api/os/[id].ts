import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/utils/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { id, status } = req.query;

  if (!id || !status) {
    return res.status(400).json({ error: 'ID e status são obrigatórios.' });
  }

  try {
    let os;

    if (status === 'pendente') {
      os = await prisma.os.findUnique({
        where: { id: parseInt(id as string, 10) },
      });
    } else if (status === 'confirmada') {
      os = await prisma.osAssinada.findUnique({
        where: { id: parseInt(id as string, 10) },
      });
    } else {
      return res.status(400).json({ error: 'Status inválido.' });
    }

    if (!os) {
      return res.status(404).json({ error: 'OS não encontrada.' });
    }

    res.status(200).json(os);
  } catch (error) {
    console.error('Erro ao buscar OS:', error);
    res.status(500).json({ error: 'Erro ao buscar OS.' });
  }
}