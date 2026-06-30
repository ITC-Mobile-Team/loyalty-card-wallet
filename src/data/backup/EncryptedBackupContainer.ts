import { base64ToBytes, bytesToBase64 } from "../../core/encoding/base64";
import {
  BACKUP_ENVELOPE_VERSION,
  BACKUP_LIMITS,
  CURRENT_BACKUP_PAYLOAD_VERSION,
  backupError,
  isBackupError,
  type BackupByteWriter,
  type BackupCrypto,
  type BackupPayload,
  type BackupPayloadSource,
  type BundleCodec
} from "../../domain/backup/Backup";

import {
  BackupStreamReader,
  concatBytes,
  readUint32,
  textDecoder,
  textEncoder,
  uint32Bytes
} from "./backupBytes";

const MAGIC = textEncoder.encode("LCWBKP01");
const KDF_ITERATIONS = 210_000;

type EnvelopeHeader = {
  app: "loyalty-card-wallet";
  envelopeVersion: 1;
  payloadVersion: number;
  kdf: { name: "PBKDF2-HMAC-SHA256"; salt: string; iterations: number };
  cipher: { name: "AES-256-GCM"; ivLength: 12; tagLength: 16 };
};

function recordAdditionalData(headerBytes: Uint8Array, index: number): Uint8Array {
  return concatBytes(headerBytes, uint32Bytes(index));
}

export type DecodedContainer = {
  envelopeVersion: number;
  sourcePayloadVersion: number;
  payload: BackupPayload;
};

export class EncryptedBackupContainer {
  constructor(
    private readonly crypto: BackupCrypto,
    private readonly codec: BundleCodec
  ) {}

  async write(
    payload: BackupPayload | BackupPayloadSource,
    passphrase: string,
    writer: BackupByteWriter,
    targetPayloadVersion: 1 | 2 = CURRENT_BACKUP_PAYLOAD_VERSION
  ): Promise<void> {
    this.validatePassphrase(passphrase);
    const salt = await this.crypto.randomBytes(16);
    const header: EnvelopeHeader = {
      app: "loyalty-card-wallet",
      envelopeVersion: BACKUP_ENVELOPE_VERSION,
      payloadVersion: targetPayloadVersion,
      kdf: { name: "PBKDF2-HMAC-SHA256", salt: bytesToBase64(salt), iterations: KDF_ITERATIONS },
      cipher: { name: "AES-256-GCM", ivLength: 12, tagLength: 16 }
    };
    const headerBytes = textEncoder.encode(JSON.stringify(header));
    const key = await this.crypto.deriveKey(passphrase, salt, KDF_ITERATIONS);

    await writer.write(MAGIC);
    await writer.write(uint32Bytes(headerBytes.byteLength));
    await writer.write(headerBytes);

    let index = 0;
    for await (const record of this.codec.encode(payload, targetPayloadVersion)) {
      if (record.byteLength > BACKUP_LIMITS.maxRecordBytes) {
        throw backupError("oversizedWallet", "Backup record exceeds the supported size.");
      }
      const sealed = await this.crypto.encryptRecord(record, key, recordAdditionalData(headerBytes, index));
      await writer.write(uint32Bytes(sealed.byteLength));
      await writer.write(sealed);
      index += 1;
    }
  }

  async read(stream: ReadableStream<Uint8Array>, passphrase: string): Promise<DecodedContainer> {
    this.validatePassphrase(passphrase);
    const reader = new BackupStreamReader(stream);

    try {
      const magic = await reader.readExact(MAGIC.byteLength);
      if (!MAGIC.every((value, index) => magic[index] === value)) {
        throw backupError("invalidContainer", "Selected file is not a Loyalty Card Wallet backup.");
      }

      const headerLength = readUint32(await reader.readExact(4));
      if (headerLength <= 0 || headerLength > BACKUP_LIMITS.maxHeaderBytes) {
        throw backupError("invalidContainer", "Backup header size is invalid.");
      }
      const headerBytes = await reader.readExact(headerLength);
      const header = this.parseHeader(headerBytes);
      const salt = base64ToBytes(header.kdf.salt);
      const key = await this.crypto.deriveKey(passphrase, salt, header.kdf.iterations);
      const crypto = this.crypto;

      async function* decryptedRecords(): AsyncIterable<Uint8Array> {
        let index = 0;
        while (true) {
          const lengthBytes = await reader.readExactOrNull(4);
          if (!lengthBytes) return;
          const sealedLength = readUint32(lengthBytes);
          if (sealedLength <= 28 || sealedLength > BACKUP_LIMITS.maxRecordBytes + 64) {
            throw backupError("invalidContainer", "Encrypted backup record size is invalid.");
          }
          const sealed = await reader.readExact(sealedLength);
          try {
            yield await crypto.decryptRecord(sealed, key, recordAdditionalData(headerBytes, index));
          } catch {
            throw backupError(
              index === 0 ? "wrongPassphrase" : "tampered",
              index === 0
                ? "The backup passphrase is incorrect or the file is damaged."
                : "Backup authentication failed because a record was changed.",
              { retryable: index === 0 }
            );
          }
          index += 1;
        }
      }

      const payload = await this.codec.decode(header.payloadVersion, decryptedRecords());
      return {
        envelopeVersion: header.envelopeVersion,
        sourcePayloadVersion: header.payloadVersion,
        payload
      };
    } catch (error) {
      if (isBackupError(error)) throw error;
      if (error instanceof Error && /Unexpected end/.test(error.message)) {
        throw backupError("truncated", "Backup file ended unexpectedly.");
      }
      throw backupError("invalidContainer", "Backup container could not be read.");
    }
  }

  private validatePassphrase(passphrase: string): void {
    const length = textEncoder.encode(passphrase).byteLength;
    if (length < 8 || length > BACKUP_LIMITS.maxPassphraseBytes) {
      throw backupError("invalidPayload", "Backup passphrase must be between 8 and 1,024 bytes.");
    }
  }

  private parseHeader(bytes: Uint8Array): EnvelopeHeader {
    let value: unknown;
    try {
      value = JSON.parse(textDecoder.decode(bytes));
    } catch {
      throw backupError("invalidContainer", "Backup header is invalid.");
    }
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      throw backupError("invalidContainer", "Backup header is invalid.");
    }
    const header = value as Partial<EnvelopeHeader>;
    if (typeof header.envelopeVersion !== "number") {
      throw backupError("invalidContainer", "Backup envelope version is missing.");
    }
    if (header.envelopeVersion > BACKUP_ENVELOPE_VERSION) {
      throw backupError("futureEnvelope", "Backup envelope was created by a newer app version.");
    }
    if (
      header.app !== "loyalty-card-wallet" ||
      header.envelopeVersion !== BACKUP_ENVELOPE_VERSION ||
      typeof header.payloadVersion !== "number" ||
      header.kdf?.name !== "PBKDF2-HMAC-SHA256" ||
      typeof header.kdf.salt !== "string" ||
      header.kdf.iterations !== KDF_ITERATIONS ||
      header.cipher?.name !== "AES-256-GCM" ||
      header.cipher.ivLength !== 12 ||
      header.cipher.tagLength !== 16
    ) {
      throw backupError("unsupportedEnvelope", "Backup envelope settings are not supported.");
    }
    return header as EnvelopeHeader;
  }
}
