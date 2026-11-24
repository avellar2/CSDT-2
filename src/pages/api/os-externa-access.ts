import { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/utils/prisma";
import { requireAuth } from "@/utils/api-auth";
import { authorizeOsExterna } from "@/utils/osExternaAuthorization";
import {
  formatBrazilDateKey,
  getBrazilDayRange,
} from "@/utils/dailyDemandOsRules";

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
    const os = await prisma.oSExterna.findUnique({
      where: { numeroOs },
      select: {
        id: true,
        numeroOs: true,
        unidadeEscolar: true,
        tecnicoResponsavel: true,
        data: true,
        status: true,
        routeId: true,
        createdAt: true,
        assinado: true,
        fotosAntes: true,
        fotosDepois: true,
        lastEmailSent: true,
      },
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

    return res.status(200).json({
      allowed: true,
      reason: permission.reason,
      os: {
        id: os.id,
        numeroOs: os.numeroOs,
        unidadeEscolar: os.unidadeEscolar,
        tecnicoResponsavel: os.tecnicoResponsavel,
        data: os.data,
        status: os.status,
        routeId: os.routeId,
        createdAt: os.createdAt,
        fotosAntes: os.fotosAntes || [],
        fotosDepois: os.fotosDepois || [],
        lastEmailSent: os.lastEmailSent,
      },
      confirmToken,
      alreadySigned: !isPending,
      emailSentToday,
    });
  } catch (error) {
    console.error("Erro ao validar acesso à OS externa:", error);
    return res.status(500).json({ error: "Erro interno do servidor" });
  }
}
