import { MAX_AVATAR_BYTES } from "./profile";
export async function prepareProfilePhoto(file: File): Promise<Blob> {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type))
    throw new Error("JPEG・PNG・WebPの写真を選んでください");
  if (file.size > 10 * 1024 * 1024)
    throw new Error("10MB以下の写真を選んでください");
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = url;
    await image.decode().catch(() => {
      throw new Error("写真を読み込めませんでした。別の写真を選んでください");
    });
    const side = Math.min(image.naturalWidth, image.naturalHeight);
    if (!side || image.naturalWidth * image.naturalHeight > 50_000_000)
      throw new Error("写真のサイズが大きすぎます");
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = Math.min(512, side);
    const context = canvas.getContext("2d");
    if (!context) throw new Error("このブラウザでは写真を処理できません");
    context.fillStyle = "#fff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(
      image,
      (image.naturalWidth - side) / 2,
      (image.naturalHeight - side) / 2,
      side,
      side,
      0,
      0,
      canvas.width,
      canvas.height,
    );
    for (const quality of [0.86, 0.72, 0.58]) {
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/jpeg", quality),
      );
      if (blob && blob.size <= MAX_AVATAR_BYTES) return blob;
    }
    throw new Error(
      "写真を保存用に整えられませんでした。別の写真を選んでください",
    );
  } finally {
    URL.revokeObjectURL(url);
  }
}
export function photoDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("写真を保存できませんでした"));
    reader.readAsDataURL(blob);
  });
}
