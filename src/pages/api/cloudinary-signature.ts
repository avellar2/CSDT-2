import type { NextApiRequest, NextApiResponse } from "next";
import { v2 as cloudinary } from "cloudinary";
import { randomUUID } from "crypto";
import prisma from "@/utils/prisma";
import { requireAuth } from "@/utils/api-auth";
import { authorizeOsExterna } from "@/utils/osExternaAuthorization";

/**
 * Gera uma assinatura de upload direto para o Cloudinary.
 *
 * O navegador envia a foto comprimida direto para
 * `https://api.cloudinary.com/v1_1/<cloud>/image/upload`, sem passar pelo
 * corpo de 4,5 MB da função da Vercel. O `api_secret` fica exclusivamente no
 * servidor: o cliente recebe apenas a assinatura de curta duração, a api_key e
 * o cloud_name (informações públicas por natureza).
 *
 * Segurança:
 * - `scope = "os-externa"`: exige `numeroOs` e `field`; valida a autorização
 *   do usuário SOBRE AQUELA OS (não basta estar autenticado). A pasta e o
 *   `public_id` são definidos pelo servidor — o cliente não escolhe caminho
 *   nem nome, impedindo sobrescrever arquivos de outra OS.
 * - `scope = "chada"`: mantém o fluxo do módulo CHADA, restrito a perfis
 *   operacionais, com `public_id` gerado no servidor.
 */

const OS_EXTERNA_FIELDS = ["fotos-antes", "fotos-depois"] as const;
type OsExternaField = (typeof OS_EXTERNA_FIELDS)[number];

const OPERATOR_ROLES = ["TECH", "ADMIN", "ADMTOTAL"];

function isOsExternaField(value: unknown): value is OsExternaField {
  return (
    typeof value === "string" &&
    (OS_EXTERNA_FIELDS as readonly string[]).includes(value)
  );
}

function sanitizeItemId(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > 120) return null;
  if (!/^[A-Za-z0-9._-]+$/.test(trimmed) || trimmed.includes("..")) return null;
  return trimmed;
}

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

  if (!OPERATOR_ROLES.includes(auth.profile.role)) {
    return res.status(403).json({
      error: "Perfil sem permissão para enviar fotos.",
    });
  }

  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    // O cliente cai automaticamente para o endpoint tradicional.
    return res.status(503).json({
      error: "Upload direto não configurado.",
      fallback: "proxy",
    });
  }

  const body = (req.body ?? {}) as {
    scope?: unknown;
    numeroOs?: unknown;
    field?: unknown;
    itemId?: unknown;
  };

  let folder: string;
  let publicId: string;
  let scope: "os-externa" | "chada";

  if (body.scope === "os-externa") {
    const numeroOs =
      typeof body.numeroOs === "string" ? body.numeroOs.trim() : "";
    const field = body.field;

    if (!numeroOs) {
      return res.status(400).json({ error: "numeroOs é obrigatório." });
    }
    if (!isOsExternaField(field)) {
      return res.status(400).json({ error: "Tipo de foto inválido." });
    }

    const os = await prisma.oSExterna.findUnique({
      where: { numeroOs },
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

    // OS assinada/recusada não recebe mais fotos.
    if (os.status !== "Pendente") {
      return res.status(409).json({
        error: "Esta OS não está mais pendente e não pode receber fotos.",
      });
    }

    scope = "os-externa";
    // Pasta derivada da OS AUTORIZADA; o cliente não informa caminho.
    folder = `os-externa-img/${field}/${numeroOs}`;
    // Nome gerado no servidor: impossível sobrescrever um arquivo existente.
    publicId = `${Date.now()}-${randomUUID()}`;
  } else if (body.scope === "chada") {
    const itemId = sanitizeItemId(body.itemId);
    if (!itemId) {
      return res.status(400).json({ error: "itemId inválido." });
    }

    scope = "chada";
    folder = "os-images";
    publicId = `${itemId}-${Date.now()}-${randomUUID()}`;
  } else {
    return res.status(400).json({
      // Clientes antigos recebem 400 e caem para o proxy, que continua
      // funcionando com a foto já comprimida.
      error: "Escopo de upload inválido.",
      fallback: "proxy",
    });
  }

  const timestamp = Math.floor(Date.now() / 1000);

  const paramsToSign = {
    folder,
    public_id: publicId,
    timestamp,
  };

  try {
    const signature = cloudinary.utils.api_sign_request(paramsToSign, apiSecret);

    res.setHeader("Cache-Control", "no-store");
    return res.status(200).json({
      cloudName,
      apiKey,
      timestamp,
      signature,
      folder,
      publicId,
      scope,
    });
  } catch (error) {
    console.error("Erro ao assinar upload do Cloudinary:", error);
    return res.status(500).json({ error: "Erro ao preparar o upload da foto." });
  }
}
