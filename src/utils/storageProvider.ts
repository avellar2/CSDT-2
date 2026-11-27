/**
 * Sistema unificado de Storage - Permite escolher entre Cloudinary e Supabase
 *
 * Configure qual storage usar no arquivo .env:
 * STORAGE_PROVIDER="cloudinary" ou "supabase"
 *
 * Correções do fluxo de OS externa em celular:
 * - A foto é comprimida/redimensionada ANTES de sair do aparelho
 *   (ver `imageCompression.ts`), evitando o 413 do corpo de 4,5 MB da Vercel.
 * - Cloudinary usa upload direto assinado no navegador. A assinatura é gerada
 *   por uma API autenticada; o `api_secret` nunca chega ao frontend.
 * - O endpoint `/api/upload-cloudinary` continua como fallback quando o
 *   provider é Supabase ou quando a assinatura não está configurada.
 * - Cada arquivo tem resultado individual (URL ou motivo da falha), com
 *   retentativa limitada só para falhas temporárias.
 */

import { supabase } from "@/lib/supabaseClient";
import { authedFetch, getApiErrorMessage } from "@/utils/client-auth";
import {
  prepareImageForUpload,
  sanitizeFileName,
  type PreparedImage,
} from "@/utils/imageCompression";

// Tipo de provider de storage
export type StorageProvider = "cloudinary" | "supabase";

export interface UploadReport {
  urls: string[];
  errors: string[];
}

export interface UploadFileResult {
  file: File;
  fileName: string;
  url: string | null;
  error: string | null;
  originalSize: number;
  uploadedSize: number;
}

export interface DetailedUploadReport extends UploadReport {
  results: UploadFileResult[];
}

export interface UploadProgressOptions {
  onFileStart?: (info: { file: File; index: number; total: number }) => void;
  onFileDone?: (result: UploadFileResult, index: number, total: number) => void;
}

// Configuração: escolha qual storage usar
const STORAGE_PROVIDER: StorageProvider =
  (process.env.NEXT_PUBLIC_STORAGE_PROVIDER as StorageProvider) || "cloudinary";

const MAX_ATTEMPTS = 3;
const UPLOAD_TIMEOUT_MS = 90_000;

interface CloudinarySignature {
  cloudName: string;
  apiKey: string;
  timestamp: number;
  signature: string;
  folder: string;
  publicId: string;
  scope: "os-externa" | "chada";
}

type SignatureRequest =
  | {
      scope: "os-externa";
      numeroOs: string;
      field: "fotos-antes" | "fotos-depois";
    }
  | { scope: "chada"; itemId: string };

function getFetch(): typeof fetch {
  if (typeof fetch === "undefined") {
    throw new Error("fetch indisponível neste ambiente.");
  }
  return fetch;
}

async function fetchWithTimeout(
  input: RequestInfo | URL,
  init: RequestInit = {},
  timeoutMs = UPLOAD_TIMEOUT_MS
): Promise<Response> {
  const fetchImpl = getFetch();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetchImpl(input, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryableStatus(status: number): boolean {
  return status === 408 || status === 425 || status === 429 || status >= 500;
}

function isRetryableError(error: unknown): boolean {
  if (error instanceof DOMException && error.name === "AbortError") return true;
  if (error instanceof TypeError) return true; // falha de rede / CORS temporário
  if (error instanceof Error) {
    return /network|failed to fetch|timeout|timed out|load failed/i.test(
      error.message
    );
  }
  return false;
}

function describeUploadFailure(status: number, apiMessage: string | null): string {
  if (status === 413) {
    return "A foto excedeu o limite de 4,5 MB da requisição. Ela foi rejeitada antes de chegar ao armazenamento.";
  }
  if (status === 401 || status === 403) {
    return "Sessão expirada ou sem permissão para enviar a foto. Entre novamente no sistema.";
  }
  if (status === 429) {
    return "Muitas tentativas de upload em pouco tempo. Aguarde alguns segundos e tente novamente.";
  }
  if (status >= 500) {
    return "O servidor de armazenamento falhou ao receber a foto. Tente novamente.";
  }
  return apiMessage || `Falha ao enviar a foto (HTTP ${status}).`;
}

async function readErrorMessage(response: Response): Promise<string | null> {
  try {
    const text = await response.clone().text();
    if (!text) return null;
    try {
      const data = JSON.parse(text) as { error?: unknown; message?: unknown };
      if (typeof data.error === "string" && data.error.trim()) return data.error.trim();
      if (typeof data.message === "string" && data.message.trim()) return data.message.trim();
    } catch {
      return text.slice(0, 300);
    }
  } catch {
    // corpo binário/indisponível
  }
  return null;
}

/* ------------------------------------------------------------------ */
/* Cloudinary                                                          */
/* ------------------------------------------------------------------ */

/**
 * A assinatura é vinculada à OS/CHADA AUTORIZADA no servidor. O cliente não
 * escolhe pasta nem `public_id`: isso impede sobrescrever arquivos de outra
 * OS e mantém o `api_secret` fora do navegador.
 */
async function requestCloudinarySignature(
  request: SignatureRequest
): Promise<CloudinarySignature | null> {
  try {
    const response = await authedFetch(
      "/api/cloudinary-signature",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request),
      },
      { retryOn401: true }
    );

    if (!response.ok) return null;

    const data = (await response.json().catch(() => null)) as
      | Partial<CloudinarySignature>
      | null;

    if (
      !data ||
      typeof data.cloudName !== "string" ||
      typeof data.apiKey !== "string" ||
      typeof data.signature !== "string" ||
      typeof data.timestamp !== "number" ||
      typeof data.folder !== "string" ||
      typeof data.publicId !== "string" ||
      data.scope !== request.scope
    ) {
      return null;
    }

    return data as CloudinarySignature;
  } catch {
    return null;
  }
}

async function uploadDirectToCloudinary(
  image: PreparedImage,
  signature: CloudinarySignature
): Promise<string> {
  const body = new FormData();
  body.append("file", image.blob, image.fileName);
  body.append("api_key", signature.apiKey);
  body.append("timestamp", String(signature.timestamp));
  body.append("signature", signature.signature);
  body.append("folder", signature.folder);
  body.append("public_id", signature.publicId);

  const response = await fetchWithTimeout(
    `https://api.cloudinary.com/v1_1/${encodeURIComponent(signature.cloudName)}/image/upload`,
    { method: "POST", body }
  );

  if (!response.ok) {
    const message = await readErrorMessage(response);
    const error = new Error(
      describeUploadFailure(response.status, message)
    ) as Error & { status?: number };
    error.status = response.status;
    throw error;
  }

  const data = (await response.json().catch(() => null)) as
    | { secure_url?: unknown; url?: unknown }
    | null;
  const url =
    typeof data?.secure_url === "string"
      ? data.secure_url
      : typeof data?.url === "string"
      ? data.url
      : null;

  if (!url) throw new Error("O Cloudinary não retornou a URL da foto.");
  return url;
}

async function uploadViaProxy(
  image: PreparedImage,
  endpointFolder: string
): Promise<string> {
  const formData = new FormData();
  formData.append("file", image.blob, image.fileName);
  formData.append("folder", endpointFolder);
  formData.append("fileName", image.fileName);

  const response = await authedFetch(
    "/api/upload-cloudinary",
    { method: "POST", body: formData },
    { retryOn401: true }
  );

  if (!response.ok) {
    const message = await readErrorMessage(response);
    const error = new Error(
      describeUploadFailure(response.status, message)
    ) as Error & { status?: number };
    error.status = response.status;
    throw error;
  }

  const data = (await response.json().catch(() => null)) as
    | { url?: unknown }
    | null;
  if (typeof data?.url !== "string" || !data.url) {
    throw new Error("A API de upload não retornou a URL da foto.");
  }
  return data.url;
}

async function uploadPreparedToCloudinary(
  image: PreparedImage,
  folder: string,
  numeroOs: string
): Promise<string> {
  const field =
    folder === "fotos-antes" ? "fotos-antes" : "fotos-depois";
  const signature = await requestCloudinarySignature({
    scope: "os-externa",
    numeroOs,
    field,
  });

  let lastError: unknown = null;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      if (signature) {
        return await uploadDirectToCloudinary(image, signature);
      }
      // Sem assinatura configurada: caminho antigo, agora com a foto já
      // comprimida (bem abaixo do limite da Vercel).
      return await uploadViaProxy(
        image,
        `os-externa-img/${folder}/${numeroOs}`
      );
    } catch (error) {
      lastError = error;
      const status = (error as { status?: number }).status;
      const retryable = status ? isRetryableStatus(status) : isRetryableError(error);
      if (!retryable || attempt === MAX_ATTEMPTS) break;
      await sleep(500 * attempt);
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("Falha ao enviar a foto.");
}

/* ------------------------------------------------------------------ */
/* Supabase                                                            */
/* ------------------------------------------------------------------ */

async function uploadPreparedToSupabase(
  image: PreparedImage,
  bucket: string,
  filePath: string
): Promise<string> {
  let lastError: unknown = null;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(filePath, image.blob, {
          contentType: image.mimeType,
          cacheControl: "3600",
          upsert: false,
        });

      if (error) throw error;
      if (!data) throw new Error("Nenhum dado retornado do upload.");

      const { data: publicUrlData } = supabase.storage
        .from(bucket)
        .getPublicUrl(filePath);

      if (!publicUrlData?.publicUrl) {
        throw new Error("Não foi possível obter o link público da foto.");
      }

      return publicUrlData.publicUrl;
    } catch (error) {
      lastError = error;
      if (attempt === MAX_ATTEMPTS || !isRetryableError(error)) break;
      await sleep(500 * attempt);
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("Falha ao enviar a foto ao Supabase.");
}

/* ------------------------------------------------------------------ */
/* API pública                                                         */
/* ------------------------------------------------------------------ */

/**
 * Comprime e envia UMA foto. Nunca lança: devolve o erro individual para que
 * o fluxo continue com as demais fotos e informe exatamente qual falhou.
 */
export async function uploadSingleImage(
  file: File,
  folder: string,
  numeroOs: string,
  provider: StorageProvider = STORAGE_PROVIDER
): Promise<UploadFileResult> {
  const prepared = await prepareImageForUpload(file);

  if (!prepared.ok) {
    return {
      file,
      fileName: file.name || "foto",
      url: null,
      error: prepared.error,
      originalSize: file.size,
      uploadedSize: 0,
    };
  }

  try {
    let url: string;
    if (provider === "cloudinary") {
      url = await uploadPreparedToCloudinary(prepared.image, folder, numeroOs);
    } else {
      const fileName = `${Date.now()}-${sanitizeFileName(prepared.image.fileName)}`;
      url = await uploadPreparedToSupabase(
        prepared.image,
        "os-externa-img",
        `${folder}/${numeroOs}/${fileName}`
      );
    }

    return {
      file,
      fileName: file.name || prepared.image.fileName,
      url,
      error: null,
      originalSize: file.size,
      uploadedSize: prepared.image.size,
    };
  } catch (error) {
    console.error("[Storage] Erro ao fazer upload da foto:", error);
    return {
      file,
      fileName: file.name || "foto",
      url: null,
      error:
        error instanceof Error
          ? error.message
          : "Falha ao enviar a foto. Tente novamente.",
      originalSize: file.size,
      uploadedSize: prepared.image.size,
    };
  }
}

/**
 * Upload em lote com relatório detalhado e progresso por arquivo.
 * Processa sequencialmente para não saturar a conexão móvel.
 */
export async function uploadFilesDetailed(
  files: File[],
  folder: string,
  numeroOs: string,
  options: UploadProgressOptions = {},
  provider: StorageProvider = STORAGE_PROVIDER
): Promise<DetailedUploadReport> {
  const results: UploadFileResult[] = [];
  const urls: string[] = [];
  const errors: string[] = [];
  const total = files.length;

  for (let index = 0; index < files.length; index++) {
    const file = files[index];
    options.onFileStart?.({ file, index: index + 1, total });
    const result = await uploadSingleImage(file, folder, numeroOs, provider);
    results.push(result);
    if (result.url) urls.push(result.url);
    else errors.push(result.error || result.fileName);
    options.onFileDone?.(result, index + 1, total);
  }

  return { urls, errors, results };
}

/**
 * FUNÇÃO PRINCIPAL: Upload de arquivos
 *
 * @param files - Array de arquivos File
 * @param folder - Nome da pasta (ex: "fotos-antes", "fotos-depois")
 * @param numeroOs - Número da OS para organização
 * @returns Array de URLs públicas das imagens
 */
export async function uploadFiles(
  files: File[],
  folder: string,
  numeroOs: string
): Promise<string[]> {
  const report = await uploadFilesDetailed(files, folder, numeroOs);
  return report.urls;
}

/**
 * Igual a `uploadFiles`, mas informa quais arquivos falharam. O fluxo de OS
 * externa usa o relatório para não declarar sucesso quando uma foto escolhida
 * pelo técnico não foi enviada.
 */
export async function uploadFilesWithReport(
  files: File[],
  folder: string,
  numeroOs: string,
  options: UploadProgressOptions = {}
): Promise<UploadReport> {
  const report = await uploadFilesDetailed(files, folder, numeroOs, options);
  return { urls: report.urls, errors: report.errors };
}

/**
 * Upload com provider específico (override manual)
 */
export async function uploadFilesWithProvider(
  files: File[],
  folder: string,
  numeroOs: string,
  provider: StorageProvider
): Promise<string[]> {
  const report = await uploadFilesDetailed(
    files,
    folder,
    numeroOs,
    {},
    provider
  );
  return report.urls;
}

/**
 * Retorna o provider de storage atual
 */
export function getCurrentStorageProvider(): StorageProvider {
  return STORAGE_PROVIDER;
}

/* ------------------------------------------------------------------ */
/* CHADA / Diagnósticos                                                */
/* ------------------------------------------------------------------ */

async function uploadChadaToSupabase(
  files: File[],
  itemId: string
): Promise<string[]> {
  const urls: string[] = [];

  for (const file of files) {
    const prepared = await prepareImageForUpload(file);
    if (!prepared.ok) {
      console.error("[Supabase/CHADA] Foto ignorada:", prepared.error);
      continue;
    }
    try {
      const fileName = `${itemId}-${Date.now()}-${sanitizeFileName(
        prepared.image.fileName
      )}`;
      urls.push(
        await uploadPreparedToSupabase(prepared.image, "os-images", fileName)
      );
    } catch (error) {
      console.error("[Supabase/CHADA] Erro ao fazer upload da foto:", error);
    }
  }

  return urls;
}

async function uploadChadaToCloudinary(
  files: File[],
  itemId: string
): Promise<string[]> {
  const urls: string[] = [];

  for (const file of files) {
    const prepared = await prepareImageForUpload(file);
    if (!prepared.ok) {
      console.error("[Cloudinary/CHADA] Foto ignorada:", prepared.error);
      continue;
    }
    const signature = await requestCloudinarySignature({
      scope: "chada",
      itemId,
    });
    try {
      const url = signature
        ? await uploadDirectToCloudinary(prepared.image, signature)
        : await uploadViaProxy(prepared.image, "os-images");
      urls.push(url);
    } catch (error) {
      console.error("[Cloudinary/CHADA] Erro ao fazer upload da foto:", error);
    }
  }

  return urls;
}

/**
 * Upload de imagens para CHADA/Diagnósticos
 *
 * @param files - Array de arquivos File
 * @param itemId - ID do item CHADA
 * @returns Array de URLs públicas das imagens
 */
export async function uploadChadaFiles(
  files: File[],
  itemId: string
): Promise<string[]> {
  if (STORAGE_PROVIDER === "cloudinary") {
    return uploadChadaToCloudinary(files, itemId);
  }
  return uploadChadaToSupabase(files, itemId);
}
