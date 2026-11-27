/**
 * Preparação de fotos para upload em dispositivos móveis.
 *
 * As fotos saem da câmera do celular com 3–12 MB e dimensões muito acima do
 * necessário para ler patrimônios e números de série. Enviar o original para
 * a API da Vercel esbarra no limite de 4,5 MB do corpo da requisição (HTTP
 * 413). Aqui a imagem é decodificada no próprio aparelho, redimensionada para
 * no máximo 1920 px e reencodada em JPEG com qualidade entre 0,82 e 0,60 —
 * mantendo legibilidade e reduzindo o arquivo para algumas centenas de KB.
 *
 * O módulo é seguro para SSR: nenhuma API de DOM é tocada no carregamento.
 */

export const MAX_IMAGE_DIMENSION = 1920;
export const DEFAULT_JPEG_QUALITY = 0.82;
export const MIN_JPEG_QUALITY = 0.6;
/** Limite de segurança para upload por um único arquivo (proxy da Vercel). */
export const TARGET_MAX_UPLOAD_BYTES = 3.5 * 1024 * 1024;
/** Fotos acima disso são rejeitadas antes de qualquer decodificação. */
export const MAX_SOURCE_BYTES = 25 * 1024 * 1024;

export type ImageValidationCode =
  | "empty"
  | "heic"
  | "unsupported-type"
  | "too-large"
  | "unreadable"
  | "encode-failed";

export interface PreparedImage {
  blob: Blob;
  fileName: string;
  mimeType: "image/jpeg";
  originalSize: number;
  size: number;
  width: number;
  height: number;
  compressed: boolean;
}

export type PrepareImageResult =
  | { ok: true; image: PreparedImage }
  | { ok: false; code: ImageValidationCode; error: string };

const SUPPORTED_MIME = new Set(["image/jpeg", "image/png", "image/webp"]);
const SUPPORTED_EXTENSION = /\.(jpe?g|png|webp)$/i;
const HEIC_EXTENSION = /\.(heic|heif)$/i;
const HEIC_MIME = new Set(["image/heic", "image/heif", "image/heic-sequence", "image/heif-sequence"]);

export const HEIC_ERROR_MESSAGE =
  "Foto HEIC/HEIF do iPhone não pôde ser convertida neste navegador. Em Ajustes > Câmera > Formatos, escolha \"Mais Compatível\", ou envie a foto como JPG/PNG.";

function fileExtension(name: string): string {
  const match = /\.[A-Za-z0-9]+$/.exec(name || "");
  return match ? match[0] : "";
}

export function isHeicFile(file: Pick<File, "name" | "type">): boolean {
  if (file.type && HEIC_MIME.has(file.type.toLowerCase())) return true;
  return HEIC_EXTENSION.test(file.name || "");
}

export function isSupportedImageFile(file: Pick<File, "name" | "type">): boolean {
  if (file.type && SUPPORTED_MIME.has(file.type.toLowerCase())) return true;
  if (!file.type && SUPPORTED_EXTENSION.test(file.name || "")) return true;
  // Alguns navegadores móveis informam image/jpg (não padrão) ou deixam o
  // tipo vazio para arquivos vindos da câmera. A extensão desempata.
  if (file.type && /^image\/(jpe?g|pjpeg)$/i.test(file.type)) return true;
  return SUPPORTED_EXTENSION.test(file.name || "");
}

/** Dimensões finais preservando a proporção e sem ampliar a imagem. */
export function computeTargetDimensions(
  width: number,
  height: number,
  maxDimension: number = MAX_IMAGE_DIMENSION
): { width: number; height: number } {
  const safeWidth = Math.max(1, Math.round(width || 1));
  const safeHeight = Math.max(1, Math.round(height || 1));
  const longest = Math.max(safeWidth, safeHeight);
  if (longest <= maxDimension) {
    return { width: safeWidth, height: safeHeight };
  }
  const scale = maxDimension / longest;
  return {
    width: Math.max(1, Math.round(safeWidth * scale)),
    height: Math.max(1, Math.round(safeHeight * scale)),
  };
}

export function sanitizeFileName(name: string): string {
  const base = (name || "foto")
    .replace(/\.[A-Za-z0-9]+$/, "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^A-Za-z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return (base || "foto").slice(0, 80);
}

export function buildJpegFileName(name: string): string {
  return `${sanitizeFileName(name)}.jpg`;
}

function loadHtmlImage(file: Blob): Promise<{ image: HTMLImageElement; revoke: () => void }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => resolve({ image, revoke: () => URL.revokeObjectURL(url) });
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("unreadable"));
    };
    image.src = url;
  });
}

async function decodeImage(file: File): Promise<{
  source: CanvasImageSource;
  width: number;
  height: number;
  release: () => void;
}> {
  if (typeof createImageBitmap === "function") {
    try {
      // `imageOrientation: from-image` respeita o EXIF do celular (foto em pé).
      const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" } as ImageBitmapOptions);
      return {
        source: bitmap,
        width: bitmap.width,
        height: bitmap.height,
        release: () => bitmap.close?.(),
      };
    } catch {
      // Safari antigo/arquivos exóticos: cai para <img>, que também aplica EXIF.
    }
  }

  const { image, revoke } = await loadHtmlImage(file);
  return {
    source: image,
    width: image.naturalWidth || image.width,
    height: image.naturalHeight || image.height,
    release: revoke,
  };
}

function canvasToJpeg(
  canvas: HTMLCanvasElement,
  quality: number
): Promise<Blob | null> {
  return new Promise((resolve) => {
    if (typeof canvas.toBlob !== "function") {
      resolve(null);
      return;
    }
    canvas.toBlob((blob) => resolve(blob), "image/jpeg", quality);
  });
}

/**
 * Valida, redimensiona e reencoda uma foto. Nunca lança: falhas viram um
 * resultado tipado com mensagem em português para ser exibida ao técnico.
 */
export async function prepareImageForUpload(file: File): Promise<PrepareImageResult> {
  if (!file || file.size <= 0) {
    return { ok: false, code: "empty", error: "Arquivo vazio ou sem conteúdo." };
  }

  if (isHeicFile(file)) {
    return { ok: false, code: "heic", error: HEIC_ERROR_MESSAGE };
  }

  if (!isSupportedImageFile(file)) {
    return {
      ok: false,
      code: "unsupported-type",
      error: `Formato não suportado (${file.type || fileExtension(file.name) || "desconhecido"}). Use JPG, JPEG, PNG ou WEBP.`,
    };
  }

  if (file.size > MAX_SOURCE_BYTES) {
    return {
      ok: false,
      code: "too-large",
      error: `Foto maior que ${Math.round(MAX_SOURCE_BYTES / (1024 * 1024))} MB. Reduza a resolução na câmera e tente novamente.`,
    };
  }

  if (typeof document === "undefined") {
    // Ambiente sem DOM: devolve o original para não impedir o fluxo.
    return {
      ok: true,
      image: {
        blob: file,
        fileName: buildJpegFileName(file.name),
        mimeType: "image/jpeg",
        originalSize: file.size,
        size: file.size,
        width: 0,
        height: 0,
        compressed: false,
      },
    };
  }

  let decoded: Awaited<ReturnType<typeof decodeImage>>;
  try {
    decoded = await decodeImage(file);
  } catch {
    return {
      ok: false,
      code: "unreadable",
      error: "Não foi possível abrir esta foto. Selecione outra imagem ou refaça a foto.",
    };
  }

  try {
    const target = computeTargetDimensions(decoded.width, decoded.height);
    const canvas = document.createElement("canvas");
    canvas.width = target.width;
    canvas.height = target.height;
    const context = canvas.getContext("2d");
    if (!context) {
      return {
        ok: false,
        code: "encode-failed",
        error: "Este navegador não conseguiu preparar a foto. Tente outro navegador.",
      };
    }

    // Fundo branco: JPEG não tem transparência e PNGs de tela ficariam pretos.
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, target.width, target.height);
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";
    context.drawImage(decoded.source, 0, 0, target.width, target.height);

    let quality = DEFAULT_JPEG_QUALITY;
    let blob = await canvasToJpeg(canvas, quality);
    let scaledWidth = target.width;
    let scaledHeight = target.height;

    // Se ainda ficou grande demais (fotos muito detalhadas), reduz qualidade
    // e, em último caso, dimensões — sempre mantendo legibilidade.
    while (blob && blob.size > TARGET_MAX_UPLOAD_BYTES && quality > MIN_JPEG_QUALITY) {
      quality = Math.max(MIN_JPEG_QUALITY, quality - 0.1);
      blob = await canvasToJpeg(canvas, quality);
    }

    if (blob && blob.size > TARGET_MAX_UPLOAD_BYTES) {
      scaledWidth = Math.max(1, Math.round(target.width * 0.8));
      scaledHeight = Math.max(1, Math.round(target.height * 0.8));
      canvas.width = scaledWidth;
      canvas.height = scaledHeight;
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, scaledWidth, scaledHeight);
      context.drawImage(decoded.source, 0, 0, scaledWidth, scaledHeight);
      blob = await canvasToJpeg(canvas, MIN_JPEG_QUALITY);
    }

    if (!blob) {
      return {
        ok: false,
        code: "encode-failed",
        error: "Não foi possível converter a foto para JPEG neste navegador.",
      };
    }

    return {
      ok: true,
      image: {
        blob,
        fileName: buildJpegFileName(file.name),
        mimeType: "image/jpeg",
        originalSize: file.size,
        size: blob.size,
        width: scaledWidth,
        height: scaledHeight,
        compressed: blob.size < file.size,
      },
    };
  } finally {
    decoded.release();
  }
}
