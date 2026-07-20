const MAX_INPUT_BYTES = 10_000_000;
const MAX_OUTPUT_BYTES = 1_000_000;
const SIZE = 1024;

export interface ProcessedProfilePhoto {
  blob: Blob;
  previewUrl: string;
  originalBytes: number;
  processedBytes: number;
}

export async function processProfilePhoto(file: File): Promise<ProcessedProfilePhoto> {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) throw new Error("Use uma foto JPG, PNG ou WebP.");
  if (file.size > MAX_INPUT_BYTES) throw new Error("A foto original deve ter no máximo 10 MB.");
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  try {
    const side = Math.min(bitmap.width, bitmap.height);
    const sourceX = (bitmap.width - side) / 2;
    const sourceY = (bitmap.height - side) / 2;
    const canvas = document.createElement("canvas");
    canvas.width = SIZE;
    canvas.height = SIZE;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Não foi possível processar a foto neste navegador.");
    context.drawImage(bitmap, sourceX, sourceY, side, side, 0, 0, SIZE, SIZE);
    const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob((value) => value ? resolve(value) : reject(new Error("Não foi possível converter a foto para WebP.")), "image/webp", 0.88));
    if (blob.type !== "image/webp") throw new Error("Este navegador não oferece conversão segura para WebP.");
    if (blob.size > MAX_OUTPUT_BYTES) throw new Error("A foto processada ficou acima de 1 MB. Escolha outra imagem.");
    return { blob, previewUrl: URL.createObjectURL(blob), originalBytes: file.size, processedBytes: blob.size };
  } finally {
    bitmap.close();
  }
}
