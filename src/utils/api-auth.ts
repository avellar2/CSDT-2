import { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '@/lib/supabaseClient';
import prisma from '@/utils/prisma';

export type AuthUser = {
  id: string;
  email?: string;
  profile: {
    id: number;
    role: string;
    displayName: string;
    schoolId: number | null;
  };
};

/**
 * Requer autenticação via token Bearer.
 * Retorna { userId, profile } se autenticado.
 * Retorna 401 se não autenticado, 403 se sem perfil.
 */
export async function requireAuth(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<AuthUser | null> {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Token de autorização obrigatório' });
    return null;
  }

  const token = authHeader.split(' ')[1];

  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) {
    res.status(401).json({ error: 'Token inválido ou expirado' });
    return null;
  }

  const profile = await prisma.profile.findUnique({
    where: { userId: user.id },
    select: { id: true, role: true, displayName: true, schoolId: true },
  });

  if (!profile) {
    res.status(403).json({ error: 'Perfil de usuário não encontrado' });
    return null;
  }

  return {
    id: user.id,
    email: user.email,
    profile,
  };
}

/**
 * Requer autenticação + uma ou mais roles específicas.
 * Retorna 403 se a role não for permitida.
 */
export async function requireRole(
  req: NextApiRequest,
  res: NextApiResponse,
  allowedRoles: string[]
): Promise<AuthUser | null> {
  const authUser = await requireAuth(req, res);
  if (!authUser) return null;

  if (!allowedRoles.includes(authUser.profile.role)) {
    res.status(403).json({ error: 'Permissão insuficiente' });
    return null;
  }

  return authUser;
}

export const AUTH_ROLES = {
  ADMIN: 'ADMIN',
  TECH: 'TECH',
  ADMTOTAL: 'ADMTOTAL',
  ONLYREAD: 'ONLYREAD',
  SCHOOL: 'SCHOOL',
} as const;

/**
 * Perfis que podem operar chamados técnicos (criar, agendar, atualizar ou
 * excluir). ONLYREAD é somente leitura e SCHOOL só abre/acompanha os próprios
 * chamados, sem operá-los.
 */
export const TICKET_OPERATOR_ROLES = [
  AUTH_ROLES.ADMIN,
  AUTH_ROLES.ADMTOTAL,
  AUTH_ROLES.TECH,
] as const;

export function canOperateTickets(role: string): boolean {
  return (TICKET_OPERATOR_ROLES as readonly string[]).includes(role);
}