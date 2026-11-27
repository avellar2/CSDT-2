import type { NextApiRequest, NextApiResponse } from "next";
import { v2 as cloudinary } from "cloudinary";
import { requireAuth } from "@/utils/api-auth";

/**
 * Gera uma assinatura de upload direto para o Cloudinary.
 *
 * O navegador envia a foto comprimida direto para
 * `https://api.cloudinary.com/v1_1/<cloud>/image/upload`, sem passar pelo
 * corpo de 4,5 MB da função da Vercel. O `api_secret` fica exclusivamente no
 * servidor: o cliente recebe apenas a assinatura de curta duração, a api_key e
 * o cloud_name (informações públicas por natureza).
 */

const ALLOWED_FOLDER_PREFIXES = ["os-externa-img/", "os-images"];
const PUBLIC_ID_PATTERN = /^[A-Za-z0-9._/-]+$/;

function isValidFolder(folder: string): boolean {
  return (
    ALLOWED_FOLDER_PREFIXES.some((prefix) => folder.startsWith(prefix)) &&
    !folder.includes("..")
  );
}

function isValidPublicId(publicId: string): boolean {
  return (
    publicId.length > 0 &&
    publicId.length <= 200 &&
    PUBLIC_ID_PATTERN.test(publicId) &&
    !publicId.includes("..")
  );
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

  const { folder, publicId } = (req.body ?? {}) as {
    folder?: unknown;
    publicId?: unknown;
  };

  if (typeof folder !== "string" || !isValidFolder(folder.trim())) {
    return res.status(400).json({ error: "Pasta de upload inválida." });
  }

  if (typeof publicId !== "string" || !isValidPublicId(publicId.trim())) {
    return res.status(400).json({ error: "Nome do arquivo inválido." });
  }

  const timestamp = Math.floor(Date.now() / 1000);
  const normalizedFolder = folder.trim();
  const normalizedPublicId = publicId.trim();

  const paramsToSign = {
    folder: normalizedFolder,
    public_id: normalizedPublicId,
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
      folder: normalizedFolder,
      publicId: normalizedPublicId,
    });
  } catch (error) {
    console.error("Erro ao assinar upload do Cloudinary:", error);
    return res.status(500).json({ error: "Erro ao preparar o upload da foto." });
  }
}
