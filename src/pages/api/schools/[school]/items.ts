import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  const { school: id } = req.query;

  if (!id || isNaN(Number(id))) {
    return res.status(400).json({ error: 'ID inválido' });
  }

  try {
    const items = await prisma.item.findMany({
      where: { schoolId: Number(id) },
      orderBy: { createdAt: 'desc' },
    });

    // Serializar os campos de data
    const serializedItems = items.map((item) => ({
      ...item,
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
    }));

    return res.status(200).json(serializedItems);
  } catch (error) {
    console.error('Erro ao buscar itens:', error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
}