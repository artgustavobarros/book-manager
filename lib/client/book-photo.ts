import { MAX_PHOTO_BYTES, PHOTO_TYPES } from "@/lib/domain/book-photo";

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
    const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext("2d");
    if (!context) {
      throw new Error("Seu navegador não conseguiu preparar a foto.");
    }
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const image = canvas.toDataURL("image/jpeg", 0.85);
    if (image.length > Math.ceil(MAX_PHOTO_BYTES / 3) * 4 + 40) {
      throw new Error(
        "Foto grande demais após o preparo. Escolha outra imagem."
      );
    }
    return image;
  } finally {
    bitmap.close();
  }
}
