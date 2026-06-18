import { base64ToBytes, bytesToBase64 } from "./base64";

export function bytesToBase64Url(bytes: Uint8Array): string {
  return bytesToBase64(bytes).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/u, "");
}

export function base64UrlToBytes(value: string): Uint8Array {
  if (!/^[A-Za-z0-9_-]*$/u.test(value)) {
    throw { kind: "validation", field: "payload", message: "Share link payload is not valid." };
  }

  const remainder = value.length % 4;

  if (remainder === 1) {
    throw { kind: "validation", field: "payload", message: "Share link payload is not valid." };
  }

  const padding = remainder === 0 ? "" : "=".repeat(4 - remainder);
  return base64ToBytes(`${value.replace(/-/gu, "+").replace(/_/gu, "/")}${padding}`);
}

export function stringToBase64Url(value: string): string {
  return bytesToBase64Url(utf8BytesFromString(value));
}

export function base64UrlToString(value: string): string {
  return stringFromUtf8Bytes(base64UrlToBytes(value));
}

function utf8BytesFromString(value: string): Uint8Array {
  const encoded = encodeURIComponent(value);
  const bytes: number[] = [];

  for (let index = 0; index < encoded.length; index += 1) {
    if (encoded[index] === "%") {
      bytes.push(Number.parseInt(encoded.slice(index + 1, index + 3), 16));
      index += 2;
    } else {
      bytes.push(encoded.charCodeAt(index));
    }
  }

  return new Uint8Array(bytes);
}

function stringFromUtf8Bytes(bytes: Uint8Array): string {
  let encoded = "";

  for (const byte of bytes) {
    encoded += `%${byte.toString(16).padStart(2, "0")}`;
  }

  try {
    return decodeURIComponent(encoded);
  } catch {
    throw { kind: "validation", field: "payload", message: "Share link payload is not valid UTF-8." };
  }
}
