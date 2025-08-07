import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Buscar apenas usuários com role ADMIN ou ADMTOTAL
    const adminUsers = await prisma.profile.findMany({
      where: {
        role: {
          in: ['ADMIN', 'ADMTOTAL']
        }
      },
      select: {
        userId: true,
        displayName: true,
        role: true
      },
      orderBy: {
        displayName: 'asc'
      }
    });

    res.status(200).json({
      success: true,
      users: adminUsers
    });

  } catch (error) {
    console.error('Erro ao buscar administradores:', error);
    res.status(500).json({ 
      error: 'Erro interno do servidor',
      details: process.env.NODE_ENV === 'development' ? error : undefined
    });
  } finally {
    await prisma.$disconnect();
  }
}