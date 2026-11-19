import { MAX_PHOTO_BYTES, PHOTO_TYPES } from "@/lib/domain/book-photo";

export const SCANNER_SAMPLE_SIZE = 96;
const MIN_EDGE_ENERGY = 10;
const MAX_MOTION_DIFF = 7;

export function encodeCanvasToBookPhoto(
  source: CanvasImageSource,
  width: number,
  height: number
): string {
  if (width <= 0 || height <= 0) {
    throw new Error("A imagem ainda não está pronta. Tente novamente.");
  }
  const scale = Math.min(1, 1600 / Math.max(width, height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(width * scale));
  canvas.height = Math.max(1, Math.round(height * scale));
  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Seu navegador não conseguiu preparar a foto.");
  }
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(source, 0, 0, canvas.width, canvas.height);
  const image = canvas.toDataURL("image/jpeg", 0.85);
  if (image.length > Math.ceil(MAX_PHOTO_BYTES / 3) * 4 + 40) {
    throw new Error("Foto grande demais após o preparo. Escolha outra imagem.");
  }
  return image;
}

/** Redimensiona, corrige a orientação pelo decoder e remove metadados ao recodificar. */
export async function prepareBookPhoto(file: File): Promise<string> {
  if (!PHOTO_TYPES.includes(file.type)) {
    throw new Error(
      "Use JPEG, PNG ou WebP. Para HEIC, exporte a foto como JPEG."
    );
  }
  if (file.size > 20 * 1024 * 1024) {
    throw new Error("Escolha uma foto de até 20 MB.");
  }
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error("Não foi possível abrir a imagem. Escolha outra foto.");
  }
  try {
    if (bitmap.width * bitmap.height > 50_000_000) {
      throw new Error(
        "Imagem grande demais. Use uma foto de até 50 megapixels."
      );
    }
    return encodeCanvasToBookPhoto(bitmap, bitmap.width, bitmap.height);
  } finally {
    bitmap.close();
  }
}

export function captureVideoBookPhoto(video: HTMLVideoElement): string {
  if (video.videoWidth <= 0 || video.videoHeight <= 0) {
    throw new Error("A câmera ainda não está pronta. Aguarde um instante.");
  }
  return encodeCanvasToBookPhoto(video, video.videoWidth, video.videoHeight);
}

/** Extrai luminância em grade reduzida da região central do vídeo para detectar estabilidade. */
export function sampleVideoLuma(
  video: HTMLVideoElement,
  canvas: HTMLCanvasElement
): Uint8Array | null {
  const vw = video.videoWidth;
  const vh = video.videoHeight;
  if (vw <= 0 || vh <= 0) {
    return null;
  }
  const size = SCANNER_SAMPLE_SIZE;
  if (canvas.width !== size || canvas.height !== size) {
    canvas.width = size;
    canvas.height = size;
  }
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) {
    return null;
  }
  const cropSide = Math.round(Math.min(vw, vh) * 0.8);
  const sx = Math.max(0, Math.round((vw - cropSide) / 2));
  const sy = Math.max(0, Math.round((vh - cropSide) / 2));
  context.drawImage(video, sx, sy, cropSide, cropSide, 0, 0, size, size);
  const { data } = context.getImageData(0, 0, size, size);
  const luma = new Uint8Array(size * size);
  for (let i = 0, p = 0; i < luma.length; i++, p += 4) {
    luma[i] = Math.round(
      data[p] * 0.299 + data[p + 1] * 0.587 + data[p + 2] * 0.114
    );
  }
  return luma;
}

/** Mede nitidez/detalhe (bordas) e estabilidade entre quadros para evitar disparo com câmera tampada ou tremida. */
export function analyzeScannerFrame(
  prevLuma: Uint8Array | null,
  currentLuma: Uint8Array,
  width = SCANNER_SAMPLE_SIZE,
  height = SCANNER_SAMPLE_SIZE
): {
  hasDetail: boolean;
  isSteady: boolean;
  diff: number;
  edgeEnergy: number;
} {
  if (currentLuma.length < width * height) {
    return {
      hasDetail: false,
      isSteady: false,
      diff: Number.POSITIVE_INFINITY,
      edgeEnergy: 0,
    };
  }
  let edgeSum = 0;
  let edgeCount = 0;
  for (let y = 0; y < height - 1; y++) {
    const row = y * width;
    for (let x = 0; x < width - 1; x++) {
      const idx = row + x;
      const cur = currentLuma[idx];
      edgeSum +=
        Math.abs(cur - currentLuma[idx + 1]) +
        Math.abs(cur - currentLuma[idx + width]);
      edgeCount += 2;
    }
  }
  const edgeEnergy = edgeCount > 0 ? edgeSum / edgeCount : 0;

  let diff = Number.POSITIVE_INFINITY;
  if (prevLuma && prevLuma.length === currentLuma.length) {
    let diffSum = 0;
    for (let i = 0; i < currentLuma.length; i++) {
      diffSum += Math.abs(currentLuma[i] - prevLuma[i]);
    }
    diff = diffSum / currentLuma.length;
  }

  return {
    hasDetail: edgeEnergy >= MIN_EDGE_ENERGY,
    isSteady: diff <= MAX_MOTION_DIFF,
    diff,
    edgeEnergy,
  };
}
