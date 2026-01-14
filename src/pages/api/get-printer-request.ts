import type { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { id, token } = req.query;

    if (!id || !token) {
      return res.status(400).json({ error: 'ID e token são obrigatórios' });
    }

    // Buscar a solicitação
    const printerRequest = await prisma.printerRequest.findUnique({
      where: { id: parseInt(id as string) },
      include: {
        School: true,
      },
    });

    if (!printerRequest) {
      return res.status(404).json({ error: 'Solicitação não encontrada' });
    }

    // Verificar o token
    if (printerRequest.token !== token) {
      return res.status(403).json({ error: 'Token inválido' });
    }

    res.status(200).json({
      id: printerRequest.id,
      schoolName: printerRequest.School.name,
      status: printerRequest.status,
      sentAt: printerRequest.sentAt,
      completedAt: printerRequest.completedAt,
    });
  } catch (error) {
    console.error('Erro ao buscar solicitação:', error);
    res.status(500).json({ error: 'Erro ao buscar solicitação' });
  } finally {
    await prisma.$disconnect();
  }
}
