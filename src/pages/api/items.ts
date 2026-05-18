import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    const { page, size } = req.query;

    // Modo paginado: ?page=1&size=10
    if (page || size) {
      const pageNum = Math.max(1, parseInt(page as string) || 1);
      const sizeNum = Math.min(100, Math.max(1, parseInt(size as string) || 10));
      const skip = (pageNum - 1) * sizeNum;

      const [items, total] = await Promise.all([
        prisma.item.findMany({
          skip,
          take: sizeNum,
          include: {
            Profile: { select: { displayName: true } },
            School: { select: { name: true } },
          },
          orderBy: { id: 'asc' },
        }),
        prisma.item.count(),
      ]);

      return res.status(200).json({
        items,
        total,
        page: pageNum,
        size: sizeNum,
        totalPages: Math.ceil(total / sizeNum),
      });
    }

    // Sem parâmetros: retorna todos os itens (array direto, compatibilidade)
    const items = await prisma.item.findMany({
      include: {
        Profile: { select: { displayName: true } },
        School: { select: { name: true } },
      },
      orderBy: { id: 'asc' },
    });

    res.status(200).json(items);
  } catch (error) {
    console.error('Erro ao buscar itens:', error);
    res.status(500).json({ error: 'Erro ao buscar itens' });
  }
}