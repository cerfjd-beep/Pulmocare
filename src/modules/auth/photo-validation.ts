export const PHOTO_LIMIT = 3 * 1024 * 1024;
export function validPhoto(bytes: Uint8Array, mime: string) {
  if (!bytes.length || bytes.length > PHOTO_LIMIT) return false;
  if (mime === "image/jpeg") return bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
  if (mime === "image/png")
    return [137, 80, 78, 71, 13, 10, 26, 10].every((b, i) => bytes[i] === b);
  return false;
}
