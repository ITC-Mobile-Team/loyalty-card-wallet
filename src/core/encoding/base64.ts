const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

export function bytesToBase64(bytes: Uint8Array): string {
  let output = "";

  for (let index = 0; index < bytes.length; index += 3) {
    const first = bytes[index];
    const second = bytes[index + 1];
    const third = bytes[index + 2];

    output += alphabet[first >> 2];
    output += alphabet[((first & 3) << 4) | ((second ?? 0) >> 4)];
    output += index + 1 < bytes.length ? alphabet[((second & 15) << 2) | ((third ?? 0) >> 6)] : "=";
    output += index + 2 < bytes.length ? alphabet[third & 63] : "=";
  }

  return output;
}

export function base64ToBytes(value: string): Uint8Array {
  const normalized = value.replace(/\s/g, "");

  if (normalized.length % 4 !== 0 || /[^A-Za-z0-9+/=]/.test(normalized)) {
    throw { kind: "validation", field: "data", message: "Image data must be valid base64." };
  }

  const padding = normalized.endsWith("==") ? 2 : normalized.endsWith("=") ? 1 : 0;
  const bytes = new Uint8Array((normalized.length / 4) * 3 - padding);
  let byteIndex = 0;

  for (let index = 0; index < normalized.length; index += 4) {
    const first = alphabet.indexOf(normalized[index]);
    const second = alphabet.indexOf(normalized[index + 1]);
    const third = normalized[index + 2] === "=" ? 0 : alphabet.indexOf(normalized[index + 2]);
    const fourth = normalized[index + 3] === "=" ? 0 : alphabet.indexOf(normalized[index + 3]);

    if (first < 0 || second < 0 || third < 0 || fourth < 0) {
      throw { kind: "validation", field: "data", message: "Image data must be valid base64." };
    }

    const triplet = (first << 18) | (second << 12) | (third << 6) | fourth;

    if (byteIndex < bytes.length) bytes[byteIndex++] = (triplet >> 16) & 255;
    if (byteIndex < bytes.length) bytes[byteIndex++] = (triplet >> 8) & 255;
    if (byteIndex < bytes.length) bytes[byteIndex++] = triplet & 255;
  }

  return bytes;
}
