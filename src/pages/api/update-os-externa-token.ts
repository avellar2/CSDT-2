import { PrismaClient } from '@prisma/client';
import { NextApiRequest, NextApiResponse } from 'next';
import { requireAuth } from "@/utils/api-auth";
import { authorizeOsExterna } from "@/utils/osExternaAuthorization";

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Grava o token de confirmação da OS: exige operador autenticado.
  const auth = await requireAuth(req, res);
  if (!auth) return;

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    const { numeroOs, assinado } = req.body;

    if (typeof numeroOs !== "string" || !numeroOs.trim()) {
      return res.status(400).json({ error: "numeroOs é obrigatório." });
    }

    if (typeof assinado !== "string" || assinado.trim().length < 8) {
      return res.status(400).json({ error: "Token de confirmação inválido." });
    }

    // Buscar a OS pelo número
    const osExistente = await prisma.oSExterna.findFirst({
      where: {
        numeroOs: numeroOs
      }
    });

    if (!osExistente) {
      return res.status(404).json({ error: 'OS não encontrada' });
    }

    const permission = await authorizeOsExterna(auth, osExistente);
    if (!permission.allowed) {
      return res.status(403).json({ error: permission.reason });
    }

    // Nunca sobrescreve o token de uma OS já assinada pela escola. Isso
    // protege a assinatura caso o técnico tente retomar uma finalização
    // antiga depois da confirmação.
    if (osExistente.status && osExistente.status !== 'Pendente') {
      return res.status(409).json({
        error: 'Esta OS já foi assinada e não pode receber um novo token de confirmação.',
      });
    }

    // Token já gravado é reutilizado. Sobrescrever invalidaria um link que a
    // escola porventura já tenha recebido.
    if (typeof osExistente.assinado === "string" && osExistente.assinado.length > 10) {
      return res.status(200).json({
        success: true,
        message: "Token de confirmação já existente",
        token: osExistente.assinado,
        existing: true,
      });
    }

    // Atualizar o token de confirmação
    await prisma.oSExterna.update({
      where: {
        id: osExistente.id
      },
      data: {
        assinado: assinado,
      },
    });

    res.status(200).json({
      success: true,
      message: 'Token atualizado com sucesso',
      token: assinado,
      existing: false,
    });
  } catch (error) {
    console.error('Erro ao atualizar token:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  } finally {
    await prisma.$disconnect();
  }
}