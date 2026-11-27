import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/utils/prisma";
import { requireAuth } from "@/utils/api-auth";
import { authorizeOsExterna } from "@/utils/osExternaAuthorization";
import {
  saveOsExternaFinalizationState,
  type StoredFinalizationStage,
} from "@/utils/osExternaFinalizationState";

/**
 * Registra, no banco, a etapa exata em que a finalização técnica parou.
 *
 * Isso permite que a lista "Finalização pendente" e a retomada em outro
 * aparelho distingam fotos/token/e-mail/chamado. Se a tabela aditiva ainda não
 * existir, responde 200 com `persisted: false` — o fluxo nunca quebra por
 * causa do registro de estado.
 */

const ALLOWED_STAGES: StoredFinalizationStage[] = [
  "fotos",
  "token",
  "pdf",
  "email",
  "chamado",
  "aguardando-assinatura",
];

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const auth = await requireAuth(req, res);
  if (!auth) return;

  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: "Método não permitido" });
  }

  const { numeroOs, stage, lastError } = (req.body ?? {}) as {
    numeroOs?: unknown;
    stage?: unknown;
    lastError?: unknown;
  };

  if (typeof numeroOs !== "string" || !numeroOs.trim()) {
    return res.status(400).json({ error: "numeroOs é obrigatório." });
  }

  if (typeof stage !== "string" || !ALLOWED_STAGES.includes(stage as StoredFinalizationStage)) {
    return res.status(400).json({ error: "Etapa de finalização inválida." });
  }

  try {
    const os = await prisma.oSExterna.findUnique({
      where: { numeroOs: numeroOs.trim() },
      select: {
        id: true,
        numeroOs: true,
        status: true,
        routeId: true,
        data: true,
        createdAt: true,
        tecnicoResponsavel: true,
      },
    });

    if (!os) {
      return res.status(404).json({ error: "OS não encontrada." });
    }

    const permission = await authorizeOsExterna(auth, os);
    if (!permission.allowed) {
      return res.status(403).json({ error: permission.reason });
    }

    const persisted = await saveOsExternaFinalizationState({
      osId: os.id,
      stage: stage as StoredFinalizationStage,
      lastError: typeof lastError === "string" ? lastError.slice(0, 500) : null,
      updatedBy: auth.id,
    });

    return res.status(200).json({ success: true, persisted });
  } catch (error) {
    console.error("Erro ao registrar finalização da OS externa:", error);
    return res.status(500).json({ error: "Erro interno do servidor" });
  }
}
