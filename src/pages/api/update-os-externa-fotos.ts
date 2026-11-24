import { PrismaClient } from '@prisma/client';
import { NextApiRequest, NextApiResponse } from 'next';
import { requireAuth } from "@/utils/api-auth";
import { authorizeOsExterna } from "@/utils/osExternaAuthorization";

const prisma = new PrismaClient();

function normalizePhotoUrls(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (item): item is string => typeof item === "string" && item.trim() !== ""
  );
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Autenticação antes do processamento (antes estava após o return do 405).
  const auth = await requireAuth(req, res);
  if (!auth) return;

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    const { numeroOs, fotosAntes, fotosDepois } = req.body;

    if (typeof numeroOs !== "string" || !numeroOs.trim()) {
      return res.status(400).json({ error: "numeroOs é obrigatório." });
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

    // Não basta estar autenticado: precisa poder operar esta OS.
    const permission = await authorizeOsExterna(auth, osExistente);
    if (!permission.allowed) {
      return res.status(403).json({ error: permission.reason });
    }

    if (osExistente.status !== "Pendente") {
      return res.status(409).json({
        error: "Esta OS não está mais pendente e não pode ter as fotos alteradas.",
      });
    }

    // Retomada nunca apaga fotos existentes com um array vazio.
    const nextFotosAntes = normalizePhotoUrls(fotosAntes);
    const nextFotosDepois = normalizePhotoUrls(fotosDepois);

    const updatedOs = await prisma.oSExterna.update({
      where: {
        id: osExistente.id
      },
      data: {
        fotosAntes: nextFotosAntes.length
          ? nextFotosAntes
          : osExistente.fotosAntes || [],
        fotosDepois: nextFotosDepois.length
          ? nextFotosDepois
          : osExistente.fotosDepois || [],
      },
    });

    res.status(200).json({
      success: true,
      message: 'Fotos atualizadas com sucesso',
      fotosAntes: updatedOs.fotosAntes,
      fotosDepois: updatedOs.fotosDepois
    });
  } catch (error) {
    console.error('Erro ao atualizar fotos:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  } finally {
    await prisma.$disconnect();
  }
}