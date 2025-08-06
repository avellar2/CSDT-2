import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    const { userId, displayName, photoUrl, role, schoolId } = req.body;

    try {
      const profile = await prisma.profile.create({
        data: {
          userId,
          displayName, // Corrigido para usar o campo correto
          photoUrl,
          role, // Certifique-se de que o campo role existe no modelo
          schoolId: schoolId || 225, // Adiciona associação com escola (padrão CSDT)
        },
      });

      res.status(200).json(profile);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Erro ao criar o perfil' });
    }
  } else {
    res.status(405).json({ error: 'Método não permitido' });
  }
}