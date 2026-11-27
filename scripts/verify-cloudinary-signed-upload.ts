/**
 * Validação do upload DIRETO ASSINADO do Cloudinary.
 *
 * - Gera a assinatura exatamente como `/api/cloudinary-signature` faz.
 * - Envia um PNG 1x1 descartável direto para o Cloudinary (sem passar pela
 *   Vercel, sem OS/escola envolvidos).
 * - Confirma que uma assinatura adulterada é rejeitada.
 * - Remove o asset de teste ao final.
 *
 * Nunca imprime o api_secret. Uso: npx tsx --env-file=.env scripts/verify-cloudinary-signed-upload.ts
 */

import fs from "fs";
import { randomUUID } from "crypto";
import { v2 as cloudinary } from "cloudinary";

function loadEnvFallback() {
  if (process.env.CLOUDINARY_API_SECRET) return;
  for (const file of [".env", ".env.local"]) {
    if (!fs.existsSync(file)) continue;
    for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
      const match = /^([A-Z0-9_]+)=(.*)$/.exec(line);
      if (!match) continue;
      if (!process.env[match[1]]) {
        process.env[match[1]] = match[2].replace(/^"(.*)"$/, "$1");
      }
    }
  }
}

const ONE_PIXEL_PNG_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9Z0ZkAAAAASUVORK5CYII=";

async function upload(params: {
  cloudName: string;
  apiKey: string;
  apiSecret: string;
  folder: string;
  publicId: string;
  tamper?: boolean;
}): Promise<Response> {
  const timestamp = Math.floor(Date.now() / 1000);
  let signature = cloudinary.utils.api_sign_request(
    { folder: params.folder, public_id: params.publicId, timestamp },
    params.apiSecret
  );
  if (params.tamper) signature = `${signature}0`;

  const form = new FormData();
  form.append(
    "file",
    new Blob([Buffer.from(ONE_PIXEL_PNG_BASE64, "base64")], {
      type: "image/png",
    }),
    "validacao-hotfix.png"
  );
  form.append("api_key", params.apiKey);
  form.append("timestamp", String(timestamp));
  form.append("signature", signature);
  form.append("folder", params.folder);
  form.append("public_id", params.publicId);

  return fetch(
    `https://api.cloudinary.com/v1_1/${encodeURIComponent(params.cloudName)}/image/upload`,
    { method: "POST", body: form }
  );
}

async function main() {
  loadEnvFallback();

  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error("Credenciais do Cloudinary ausentes no ambiente.");
  }

  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
    secure: true,
  });

  const folder = "os-images/_hotfix-validation";
  const publicId = `${Date.now()}-${randomUUID()}`;

  const okResponse = await upload({ cloudName, apiKey, apiSecret, folder, publicId });
  const okBody = (await okResponse.json().catch(() => null)) as {
    secure_url?: string;
    public_id?: string;
    error?: { message?: string };
  } | null;

  console.log("Upload assinado:", {
    status: okResponse.status,
    ok: okResponse.ok,
    publicId: okBody?.public_id,
    secureUrlHost: okBody?.secure_url ? new URL(okBody.secure_url).host : null,
    error: okBody?.error?.message,
  });

  if (!okResponse.ok || !okBody?.public_id) {
    throw new Error("Upload de validação falhou.");
  }

  const tamperedFolder = "os-images/_hotfix-validation";
  const tamperedPublicId = `${Date.now()}-${randomUUID()}`;
  const badResponse = await upload({
    cloudName,
    apiKey,
    apiSecret,
    folder: tamperedFolder,
    publicId: tamperedPublicId,
    tamper: true,
  });
  const badBody = (await badResponse.json().catch(() => null)) as {
    error?: { message?: string };
  } | null;
  console.log("Assinatura adulterada rejeitada:", {
    status: badResponse.status,
    rejected: !badResponse.ok,
    error: badBody?.error?.message,
  });

  const destroy = await cloudinary.uploader.destroy(okBody.public_id);
  console.log("Limpeza do asset de teste:", destroy.result);

  if (!badResponse.ok && destroy.result === "ok") {
    console.log("RESULTADO: upload assinado OK; assinatura inválida rejeitada; asset removido.");
  } else {
    throw new Error("Validação incompleta: verifique os resultados acima.");
  }
}

main().catch((error) => {
  console.error("Falha na validação do Cloudinary:", error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
