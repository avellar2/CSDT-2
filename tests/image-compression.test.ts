import { describe, expect, it } from "vitest";
import {
  buildJpegFileName,
  computeTargetDimensions,
  isHeicFile,
  isSupportedImageFile,
  sanitizeFileName,
} from "@/utils/imageCompression";

function fakeFile(name: string, type: string, size = 1024) {
  return { name, type, size } as File;
}

describe("preparação de fotos para upload móvel", () => {
  it("reduz 4032x3024 para no máximo 1920 px mantendo proporção", () => {
    expect(computeTargetDimensions(4032, 3024)).toEqual({
      width: 1920,
      height: 1440,
    });
  });

  it("nunca amplia imagens menores", () => {
    expect(computeTargetDimensions(800, 600)).toEqual({
      width: 800,
      height: 600,
    });
    expect(computeTargetDimensions(600, 1200, 1920)).toEqual({
      width: 600,
      height: 1200,
    });
  });

  it("aceita JPG, JPEG, PNG e WEBP (inclusive tipo image/jpg não padrão)", () => {
    expect(isSupportedImageFile(fakeFile("a.jpg", "image/jpeg"))).toBe(true);
    expect(isSupportedImageFile(fakeFile("a.jpeg", "image/jpeg"))).toBe(true);
    expect(isSupportedImageFile(fakeFile("a.png", "image/png"))).toBe(true);
    expect(isSupportedImageFile(fakeFile("a.webp", "image/webp"))).toBe(true);
    expect(isSupportedImageFile(fakeFile("a.jpg", "image/jpg"))).toBe(true);
    // Câmera que não informa MIME: decide pela extensão.
    expect(isSupportedImageFile(fakeFile("IMG_0001.JPG", ""))).toBe(true);
    expect(isSupportedImageFile(fakeFile("a.pdf", "application/pdf"))).toBe(false);
    expect(isSupportedImageFile(fakeFile("a.txt", ""))).toBe(false);
  });

  it("detecta HEIC/HEIF para exibir mensagem específica", () => {
    expect(isHeicFile(fakeFile("IMG_0001.HEIC", ""))).toBe(true);
    expect(isHeicFile(fakeFile("foto.heif", "image/heif"))).toBe(true);
    expect(isHeicFile(fakeFile("foto.jpg", "image/jpeg"))).toBe(false);
  });

  it("gera nome JPEG seguro para o storage", () => {
    expect(sanitizeFileName("Foto da Escola (1).PNG")).toBe(
      "Foto-da-Escola-1"
    );
    expect(buildJpegFileName("IMG 0001.HEIC")).toBe("IMG-0001.jpg");
    expect(buildJpegFileName("")).toBe("foto.jpg");
  });
});
