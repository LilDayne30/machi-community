import { HTTPException } from "hono/http-exception";
import { MAX_AVATAR_BYTES } from "../src/lib/profile";
export async function readPhoto(
  request: Request,
): Promise<Uint8Array<ArrayBuffer>> {
  if (!request.body)
    throw new HTTPException(400, { message: "写真を選んでください" });
  const reader = request.body.getReader(),
    chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_AVATAR_BYTES) {
        await reader.cancel();
        throw new HTTPException(413, {
          message: "写真の保存サイズが大きすぎます",
        });
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const result = new Uint8Array(size);
  let position = 0;
  for (const chunk of chunks) {
    result.set(chunk, position);
    position += chunk.byteLength;
  }
  return result;
}
export function validProfileJpeg(bytes: Uint8Array): boolean {
  if (
    bytes.length < 16 ||
    bytes.length > MAX_AVATAR_BYTES ||
    bytes[0] !== 255 ||
    bytes[1] !== 216 ||
    bytes.at(-2) !== 255 ||
    bytes.at(-1) !== 217
  )
    return false;
  let position = 2;
  while (position + 4 < bytes.length) {
    if (bytes[position++] !== 255) return false;
    while (bytes[position] === 255) position++;
    const marker = bytes[position++];
    if (marker === 218 || marker === 217) break;
    const length = (bytes[position] << 8) | bytes[position + 1];
    if (length < 2 || position + length > bytes.length) return false;
    if (marker === 192 || marker === 194) {
      if (length < 8) return false;
      const height = (bytes[position + 3] << 8) | bytes[position + 4],
        width = (bytes[position + 5] << 8) | bytes[position + 6];
      return height > 0 && width > 0 && height <= 512 && width <= 512;
    }
    position += length;
  }
  return false;
}
