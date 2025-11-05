/**
 * Sistema unificado de Storage - Permite escolher entre Cloudinary e Supabase
 *
 * Configure qual storage usar no arquivo .env:
 * STORAGE_PROVIDER="cloudinary" ou "supabase"
 */

import { supabase } from "@/lib/supabaseClient";

// Tipo de provider de storage
export type StorageProvider = "cloudinary" | "supabase";

// Configuração: escolha qual storage usar
const STORAGE_PROVIDER: StorageProvider =
  (process.env.NEXT_PUBLIC_STORAGE_PROVIDER as StorageProvider) || "cloudinary";

/**
 * Upload usando SUPABASE (método original)
 */
async function uploadToSupabase(
  files: File[],
  folder: string,
  numeroOs: string
): Promise<string[]> {
  const urls: string[] = [];

  for (const file of files) {
    const originalFileName = file.name && file.name.trim() !== ""
      ? file.name
      : "arquivo-sem-nome";

    const timestamp = new Date().getTime();
    const fileName = `${timestamp}-${originalFileName}`;
    const filePath = `${folder}/${numeroOs}/${fileName}`;

    try {
      console.log("[Supabase] Fazendo upload do arquivo:", fileName, "no caminho:", filePath);

      const { data, error } = await supabase.storage
        .from("os-externa-img")
        .upload(filePath, file);

      if (error) {
        console.error("[Supabase] Erro ao fazer upload:", error);
        throw error;
      }

      if (!data) {
        throw new Error("[Supabase] Nenhum dado retornado do upload.");
      }

      console.log("[Supabase] Upload bem-sucedido:", data);

      const { data: publicUrlData } = supabase.storage
        .from("os-externa-img")
        .getPublicUrl(filePath);

      if (!publicUrlData || !publicUrlData.publicUrl) {
        throw new Error("[Supabase] Erro ao obter link público.");
      }

      console.log("[Supabase] Link público gerado:", publicUrlData.publicUrl);
      urls.push(publicUrlData.publicUrl);
    } catch (error) {
      console.error("[Supabase] Erro ao fazer upload da foto:", error);
    }
  }

  return urls;
}

/**
 * Upload usando CLOUDINARY (novo método)
 */
async function uploadToCloudinary(
  files: File[],
  folder: string,
  numeroOs: string
): Promise<string[]> {
  const urls: string[] = [];

  for (const file of files) {
    try {
      const originalFileName = file.name && file.name.trim() !== ""
        ? file.name
        : "arquivo-sem-nome";

      const timestamp = new Date().getTime();
      const fileName = `${timestamp}-${originalFileName.replace(/\s+/g, '-')}`;

      // Criar FormData para enviar ao endpoint de API
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', `os-externa-img/${folder}/${numeroOs}`);
      formData.append('fileName', fileName);

      console.log("[Cloudinary] Fazendo upload do arquivo:", fileName);

      // Fazer upload via API route do Next.js
      const response = await fetch('/api/upload-cloudinary', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao fazer upload');
      }

      const data = await response.json();

      console.log("[Cloudinary] Upload bem-sucedido. URL:", data.url);
      urls.push(data.url);
    } catch (error) {
      console.error("[Cloudinary] Erro ao fazer upload da foto:", error);
    }
  }

  return urls;
}

/**
 * FUNÇÃO PRINCIPAL: Upload de arquivos
 *
 * Automaticamente usa o provider configurado (Cloudinary ou Supabase)
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
  console.log(`[Storage] Usando provider: ${STORAGE_PROVIDER}`);

  if (STORAGE_PROVIDER === "cloudinary") {
    return uploadToCloudinary(files, folder, numeroOs);
  } else {
    return uploadToSupabase(files, folder, numeroOs);
  }
}

/**
 * Upload com provider específico (override manual)
 *
 * Use essa função se quiser forçar um provider específico
 */
export async function uploadFilesWithProvider(
  files: File[],
  folder: string,
  numeroOs: string,
  provider: StorageProvider
): Promise<string[]> {
  console.log(`[Storage] Forçando uso do provider: ${provider}`);

  if (provider === "cloudinary") {
    return uploadToCloudinary(files, folder, numeroOs);
  } else {
    return uploadToSupabase(files, folder, numeroOs);
  }
}

/**
 * Retorna o provider de storage atual
 */
export function getCurrentStorageProvider(): StorageProvider {
  return STORAGE_PROVIDER;
}

/**
 * Upload para CHADA/Diagnósticos usando SUPABASE
 */
async function uploadChadaToSupabase(
  files: File[],
  itemId: string
): Promise<string[]> {
  const urls: string[] = [];

  for (const file of files) {
    try {
      const fileName = `${itemId}-${Date.now()}-${file.name}`;

      console.log("[Supabase/CHADA] Fazendo upload:", fileName);

      const { data: uploadData, error } = await supabase.storage
        .from("os-images")
        .upload(fileName, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (error) {
        console.error("[Supabase/CHADA] Erro ao fazer upload:", error);
        throw error;
      }

      const { data: publicUrlData } = supabase.storage
        .from("os-images")
        .getPublicUrl(fileName);

      const publicUrl = publicUrlData.publicUrl;
      urls.push(publicUrl);

      console.log("[Supabase/CHADA] Upload bem-sucedido:", publicUrl);
    } catch (error) {
      console.error("[Supabase/CHADA] Erro ao fazer upload da foto:", error);
    }
  }

  return urls;
}

/**
 * Upload para CHADA/Diagnósticos usando CLOUDINARY
 */
async function uploadChadaToCloudinary(
  files: File[],
  itemId: string
): Promise<string[]> {
  const urls: string[] = [];

  for (const file of files) {
    try {
      const fileName = `${itemId}-${Date.now()}-${file.name.replace(/\s+/g, '-')}`;

      console.log("[Cloudinary/CHADA] Fazendo upload:", fileName);

      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', 'os-images');
      formData.append('fileName', fileName);

      const response = await fetch('/api/upload-cloudinary', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao fazer upload');
      }

      const data = await response.json();
      urls.push(data.url);

      console.log("[Cloudinary/CHADA] Upload bem-sucedido:", data.url);
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
  console.log(`[Storage/CHADA] Usando provider: ${STORAGE_PROVIDER}`);

  if (STORAGE_PROVIDER === "cloudinary") {
    return uploadChadaToCloudinary(files, itemId);
  } else {
    return uploadChadaToSupabase(files, itemId);
  }
}
