import type { ImageMimeType } from "../../domain/images/ImageStore";
import { backupError } from "../../domain/backup/Backup";

export type VerifiedImageMetadata = {
  mimeType: ImageMimeType;
  width: number;
  height: number;
};

function startsWith(bytes: Uint8Array, signature: readonly number[]): boolean {
  return signature.every((value, index) => bytes[index] === value);
}

function pngMetadata(bytes: Uint8Array): VerifiedImageMetadata | null {
  if (!startsWith(bytes, [137, 80, 78, 71, 13, 10, 26, 10]) || bytes.byteLength < 24) return null;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  return { mimeType: "image/png", width: view.getUint32(16), height: view.getUint32(20) };
}

function jpegMetadata(bytes: Uint8Array): VerifiedImageMetadata | null {
  if (!startsWith(bytes, [0xff, 0xd8])) return null;
  let offset = 2;

  while (offset + 9 < bytes.byteLength) {
    if (bytes[offset] !== 0xff) {
      offset += 1;
      continue;
    }

    const marker = bytes[offset + 1];
    if (marker === 0xd9 || marker === 0xda) break;
    const length = (bytes[offset + 2] << 8) | bytes[offset + 3];
    if (length < 2 || offset + 2 + length > bytes.byteLength) break;

    if (
      [0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(marker)
    ) {
      return {
        mimeType: "image/jpeg",
        height: (bytes[offset + 5] << 8) | bytes[offset + 6],
        width: (bytes[offset + 7] << 8) | bytes[offset + 8]
      };
    }

    offset += 2 + length;
  }

  return null;
}

function webpMetadata(bytes: Uint8Array): VerifiedImageMetadata | null {
  if (
    bytes.byteLength < 30 ||
    !startsWith(bytes, [82, 73, 70, 70]) ||
    String.fromCharCode(...bytes.slice(8, 12)) !== "WEBP"
  ) {
    return null;
  }

  const chunk = String.fromCharCode(...bytes.slice(12, 16));

  if (chunk === "VP8X") {
    const width = 1 + bytes[24] + (bytes[25] << 8) + (bytes[26] << 16);
    const height = 1 + bytes[27] + (bytes[28] << 8) + (bytes[29] << 16);
    return { mimeType: "image/webp", width, height };
  }

  if (chunk === "VP8 " && bytes.byteLength >= 30 && startsWith(bytes.slice(23), [0x9d, 0x01, 0x2a])) {
    return {
      mimeType: "image/webp",
      width: (bytes[26] | (bytes[27] << 8)) & 0x3fff,
      height: (bytes[28] | (bytes[29] << 8)) & 0x3fff
    };
  }

  if (chunk === "VP8L" && bytes.byteLength >= 25 && bytes[20] === 0x2f) {
    const bits = bytes[21] | (bytes[22] << 8) | (bytes[23] << 16) | (bytes[24] << 24);
    return {
      mimeType: "image/webp",
      width: (bits & 0x3fff) + 1,
      height: ((bits >>> 14) & 0x3fff) + 1
    };
  }

  return null;
}

export function verifyImageMetadata(
  bytes: Uint8Array,
  declaredMimeType?: ImageMimeType,
  declaredDimensions?: { width: number; height: number }
): VerifiedImageMetadata {
  const metadata = pngMetadata(bytes) ?? jpegMetadata(bytes) ?? webpMetadata(bytes);

  if (!metadata || metadata.width <= 0 || metadata.height <= 0) {
    throw backupError("invalidImage", "Backup image header or dimensions are invalid.");
  }

  if (declaredMimeType && metadata.mimeType !== declaredMimeType) {
    throw backupError("invalidImage", "Backup image MIME type does not match its file header.");
  }

  if (
    declaredDimensions &&
    (metadata.width !== declaredDimensions.width || metadata.height !== declaredDimensions.height)
  ) {
    throw backupError("invalidImage", "Backup image dimensions do not match its file header.");
  }

  return metadata;
}
