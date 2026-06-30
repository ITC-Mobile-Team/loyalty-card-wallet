export const textEncoder = new TextEncoder();
export const textDecoder = new TextDecoder();

export function concatBytes(...parts: readonly Uint8Array[]): Uint8Array {
  const size = parts.reduce((total, part) => total + part.byteLength, 0);
  const result = new Uint8Array(size);
  let offset = 0;

  for (const part of parts) {
    result.set(part, offset);
    offset += part.byteLength;
  }

  return result;
}

export function uint32Bytes(value: number): Uint8Array {
  const bytes = new Uint8Array(4);
  new DataView(bytes.buffer).setUint32(0, value, false);
  return bytes;
}

export function readUint32(bytes: Uint8Array): number {
  return new DataView(bytes.buffer, bytes.byteOffset, 4).getUint32(0, false);
}

export class BackupStreamReader {
  private readonly reader: ReadableStreamDefaultReader<Uint8Array>;
  private buffer: Uint8Array<ArrayBufferLike> = new Uint8Array(0);
  private done = false;

  constructor(stream: ReadableStream<Uint8Array>) {
    this.reader = stream.getReader();
  }

  async readExact(length: number): Promise<Uint8Array> {
    const result = await this.readExactOrNull(length);

    if (!result) {
      throw new Error("Unexpected end of backup stream.");
    }

    return result;
  }

  async readExactOrNull(length: number): Promise<Uint8Array | null> {
    while (this.buffer.byteLength < length && !this.done) {
      const next = await this.reader.read();
      this.done = next.done;

      if (next.value?.byteLength) {
        this.buffer = concatBytes(this.buffer, next.value);
      }
    }

    if (this.buffer.byteLength === 0 && this.done) {
      return null;
    }

    if (this.buffer.byteLength < length) {
      throw new Error("Unexpected end of backup stream.");
    }

    const result = this.buffer.slice(0, length);
    this.buffer = this.buffer.slice(length);
    return result;
  }
}
