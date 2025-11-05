import { v2 as cloudinary } from 'cloudinary';

// Configurar Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * Faz upload de um arquivo para o Cloudinary
 * @param file - Arquivo a ser enviado (File ou Buffer)
 * @param folder - Pasta de destino no Cloudinary (ex: "os-externa-img/fotos-antes/123")
 * @param fileName - Nome do arquivo (opcional, será gerado automaticamente se não fornecido)
 * @returns URL pública da imagem
 */
export async function uploadToCloudinary(
  file: File | Buffer,
  folder: string,
  fileName?: string
): Promise<string> {
  try {
    // Converter File para base64 se necessário
    let fileData: string | Buffer;

    if (file instanceof File) {
      // No navegador (client-side)
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      fileData = buffer;
    } else {
      // No servidor (server-side)
      fileData = file;
    }

    // Configurar opções de upload
    const uploadOptions: any = {
      folder: folder,
      resource_type: 'auto', // auto-detecta se é imagem, vídeo, etc
    };

    if (fileName) {
      uploadOptions.public_id = fileName;
    }

    // Fazer upload
    const result = await cloudinary.uploader.upload(
      `data:${file instanceof File ? file.type : 'application/octet-stream'};base64,${
        fileData.toString('base64')
      }`,
      uploadOptions
    );

    return result.secure_url;
  } catch (error) {
    console.error('Erro ao fazer upload para Cloudinary:', error);
    throw error;
  }
}

/**
 * Faz upload de múltiplos arquivos para o Cloudinary
 * @param files - Array de arquivos
 * @param folder - Pasta de destino
 * @param numeroOs - Número da OS (usado para organização)
 * @returns Array de URLs públicas
 */
export async function uploadFilesToCloudinary(
  files: File[],
  folder: string,
  numeroOs?: string
): Promise<string[]> {
  const urls: string[] = [];

  for (const file of files) {
    try {
      const originalFileName = file.name && file.name.trim() !== ""
        ? file.name
        : "arquivo-sem-nome";

      const timestamp = new Date().getTime();
      const fileName = `${timestamp}-${originalFileName.replace(/\s+/g, '-')}`;

      // Criar caminho completo com organização por OS (se fornecido)
      const fullFolder = numeroOs
        ? `${folder}/${numeroOs}`
        : folder;

      console.log("Fazendo upload para Cloudinary:", fileName, "na pasta:", fullFolder);

      const url = await uploadToCloudinary(file, fullFolder, fileName);

      console.log("Upload bem-sucedido. URL:", url);
      urls.push(url);
    } catch (error) {
      console.error("Erro ao fazer upload da foto:", error);
      // Continua com os próximos arquivos mesmo se um falhar
    }
  }

  return urls;
}

/**
 * Deleta uma imagem do Cloudinary
 * @param publicId - ID público da imagem (path completo sem extensão)
 * @returns Resultado da operação
 */
export async function deleteFromCloudinary(publicId: string): Promise<any> {
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    return result;
  } catch (error) {
    console.error('Erro ao deletar do Cloudinary:', error);
    throw error;
  }
}

export default cloudinary;
