import { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/utils/prisma";
import { requireAuth } from "@/utils/api-auth";
import { authorizeOsExterna } from "@/utils/osExternaAuthorization";
import {
  formatBrazilDateKey,
  getBrazilDayRange,
} from "@/utils/dailyDemandOsRules";
import { deriveOsExternaFinalization } from "@/utils/osExternaFinalization";
import {
  loadOsExternaFinalizationStates,
  loadOsWithReagendamentoChamado,
} from "@/utils/osExternaFinalizationState";

/**
 * Valida, no backend, se o usuário autenticado pode retomar a finalização de
 * uma OS já salva. Retorna também as fotos e o token de confirmação atuais,
 * para que a retomada nunca sobrescreva os dados existentes com arrays vazios
 * nem invalide um link já enviado à escola.
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const auth = await requireAuth(req, res);
  if (!auth) return;

  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).json({ error: "Método não permitido" });
  }

  const numeroOs =
    typeof req.query.numeroOs === "string" ? req.query.numeroOs.trim() : "";

  if (!numeroOs) {
    return res.status(400).json({ error: "numeroOs é obrigatório." });
  }

  try {
    // Registro completo: permite retomar em OUTRO aparelho reconstruindo o
    // formulário (a autorização é validada logo abaixo, por OS).
    const os = await prisma.oSExterna.findUnique({
      where: { numeroOs },
    });

    if (!os) {
      return res.status(404).json({ error: "OS não encontrada." });
    }

    const permission = await authorizeOsExterna(auth, os);
    if (!permission.allowed) {
      return res.status(403).json({ error: permission.reason });
    }

    const isPending = os.status === "Pendente";
    const confirmToken =
      isPending && typeof os.assinado === "string" && os.assinado.length > 10
        ? os.assinado
        : null;

    const todayKey = formatBrazilDateKey(new Date());
    const { start, end } = getBrazilDayRange(todayKey);
    const emailSentToday = Boolean(
      os.lastEmailSent &&
        new Date(os.lastEmailSent) >= start &&
        new Date(os.lastEmailSent) <= end
    );

    const [storedStages, chamados] = await Promise.all([
      loadOsExternaFinalizationStates([os.id]),
      loadOsWithReagendamentoChamado(os.numeroOs ? [os.numeroOs] : []),
    ]);

    const finalization = deriveOsExternaFinalization(os, {
      storedStage: storedStages.get(os.id) || null,
      hasChamadoReagendamento: os.numeroOs ? chamados.has(os.numeroOs) : false,
    });

    return res.status(200).json({
      allowed: true,
      reason: permission.reason,
      os: {
        ...os,
        fotosAntes: os.fotosAntes || [],
        fotosDepois: os.fotosDepois || [],
      },
      confirmToken,
      alreadySigned: !isPending,
      emailSentToday,
      // A OS já foi enviada alguma vez (mesmo que em outro dia). Retomar a
      // finalização não deve reenviar o e-mail só porque mudou a data.
      emailEverSent: Boolean(os.lastEmailSent),
      lastEmailSent: os.lastEmailSent,
      finalization,
    });
  } catch (error) {
    console.error("Erro ao validar acesso à OS externa:", error);
    return res.status(500).json({ error: "Erro interno do servidor" });
  }
}
