import {
  AESEncryptionKey,
  AESSealedData,
  aesDecryptAsync,
  aesEncryptAsync,
  getRandomBytesAsync
} from "expo-crypto";
import type { BackupCrypto, BackupCryptoKey } from "@/domain/backup/Backup";

type ExpoBackupCryptoKey = BackupCryptoKey & { material: AESEncryptionKey };

export class ExpoBackupCrypto implements BackupCrypto {
  randomBytes(length: number): Promise<Uint8Array> {
    return getRandomBytesAsync(length);
  }

  async deriveKey(passphrase: string, salt: Uint8Array, iterations: number): Promise<ExpoBackupCryptoKey> {
    const [{ pbkdf2Async }, { sha256 }] = await Promise.all([
      import("@noble/hashes/pbkdf2.js"),
      import("@noble/hashes/sha2.js")
    ]);
    const bytes = await pbkdf2Async(sha256, passphrase, salt, {
      c: iterations,
      dkLen: 32,
      asyncTick: 8
    });
    return { material: await AESEncryptionKey.import(bytes) };
  }

  async encryptRecord(
    plaintext: Uint8Array,
    key: BackupCryptoKey,
    additionalData: Uint8Array,
    nonce?: Uint8Array
  ): Promise<Uint8Array> {
    const sealed = await aesEncryptAsync(plaintext, (key as ExpoBackupCryptoKey).material, {
      additionalData,
      nonce: nonce ? { bytes: nonce } : { length: 12 },
      tagLength: 16
    });
    const combined = await sealed.combined("bytes");
    return combined as Uint8Array;
  }

  decryptRecord(
    sealed: Uint8Array,
    key: BackupCryptoKey,
    additionalData: Uint8Array
  ): Promise<Uint8Array> {
    return aesDecryptAsync(
      AESSealedData.fromCombined(sealed, { ivLength: 12, tagLength: 16 }),
      (key as ExpoBackupCryptoKey).material,
      { additionalData, output: "bytes" }
    );
  }
}
