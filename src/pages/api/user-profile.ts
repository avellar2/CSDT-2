import { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '@/lib/supabaseClient';
import prisma from '@/utils/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Obtenha o token do cabeçalho
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized: Token is missing.' });
  }

  try {
    // Obtenha o usuário logado do Supabase
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({ error: 'Unauthorized: User not authenticated.' });
    }

    // Busca o perfil do usuário na tabela `profile`
    const userProfile = await prisma.profile.findUnique({
      where: { userId: user.id },
    });

    if (!userProfile) {
      return res.status(404).json({ error: 'User profile not found.' });
    }

    res.status(200).json({
      displayName: userProfile.displayName,
      email: user.email,
      userId: user.id
    });

  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}