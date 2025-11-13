import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/utils/prisma';
import { supabase } from '@/lib/supabaseClient';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Token não fornecido' });
  }

  const { data: { user }, error } = await supabase.auth.getUser(token);

  if (error || !user) {
    return res.status(401).json({ error: 'Usuário não autenticado' });
  }

  try {
    // Buscar perfil do usuário para verificar permissões
    const userProfile = await prisma.profile.findUnique({
      where: { userId: user.id },
    });

    if (!userProfile || !['ADMTOTAL', 'ADMIN'].includes(userProfile.role)) {
      return res.status(403).json({ error: 'Acesso negado' });
    }

    // Buscar todos os memorandos novos com paginação
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;

    const [memorandums, totalCount] = await Promise.all([
      prisma.newMemorandum.findMany({
        include: {
          items: {
            include: {
              Item: {
                select: {
                  id: true,
                  name: true,
                  brand: true,
                  serialNumber: true,
                }
              }
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        },
        skip: offset,
        take: limit,
      }),
      prisma.newMemorandum.count()
    ]);

    const totalPages = Math.ceil(totalCount / limit);

    res.status(200).json({
      memorandums,
      pagination: {
        currentPage: page,
        totalPages,
        totalCount,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      }
    });

  } catch (error) {
    console.error('Erro ao buscar memorandos:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
}