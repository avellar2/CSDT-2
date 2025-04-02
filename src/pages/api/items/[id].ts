import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';
import { supabase } from '@/lib/supabaseClient';

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  const { id } = req.query;
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Token não fornecido' });
  }

  const { data: { user }, error } = await supabase.auth.getUser(token);

  if (error || !user) {
    return res.status(401).json({ error: 'Usuário não autenticado' });
  }

  const uid = user.id;

  try {
    // Verifique se o item existe e se o usuário logado é o mesmo que registrou o item
    const item = await prisma.item.findUnique({
      where: { id: Number(id) },
      include: { profile: true },
    });

    if (!item) {
      return res.status(404).json({ error: 'Item não encontrado' });
    }

    if (!item.profile || item.profile.userId !== uid) {
      return res.status(403).json({ error: 'Você não tem permissão para apagar este item' });
    }

    // Apague o item
    await prisma.item.delete({
      where: { id: Number(id) },
    });

    res.status(200).json({ message: 'Item apagado com sucesso' });
  } catch (error) {
    console.error('Erro ao apagar item:', error);
    res.status(500).json({ error: 'Erro ao apagar item' });
  }
}