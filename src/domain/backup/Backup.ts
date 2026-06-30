import type { BarcodeFormat } from "../cards/Card";
import type { DuplicateImportStrategy } from "../sharing/SharingPorts";
import type { ImageMimeType, ImageRole } from "../images/ImageStore";

export const BACKUP_ENVELOPE_VERSION = 1;
export const CURRENT_BACKUP_PAYLOAD_VERSION = 2;
export const SUPPORTED_BACKUP_PAYLOAD_VERSIONS = [1, 2] as const;

export const BACKUP_LIMITS = {
  maxCards: 5_000,
  maxImages: 15_000,
  maxImageBytes: 12 * 1024 * 1024,
  maxRecordBytes: 16 * 1024 * 1024,
  maxDecodedBytes: 256 * 1024 * 1024,
  maxHeaderBytes: 4 * 1024,
  maxPassphraseBytes: 1_024,
  imageConcurrency: 2
} as const;

export type BackupErrorReason =
  | "canceled"
  | "wrongPassphrase"
  | "tampered"
  | "truncated"
  | "futureEnvelope"
  | "futurePayload"
  | "unsupportedEnvelope"
  | "unsupportedPayload"
  | "invalidContainer"
  | "invalidPayload"
  | "oversizedImage"
  | "oversizedWallet"
  | "invalidImage"
  | "lowStorage"
  | "providerUnavailable"
  | "providerFailure"
  | "authenticationRequired"
  | "authenticationFailed"
  | "writeFailed";

export type BackupError = {
  kind: "backup";
  reason: BackupErrorReason;
  message: string;
  retryable: boolean;
  cardIndex?: number;
  imageIndex?: number;
};

export type BackupImage = {
  role: ImageRole;
  mimeType: ImageMimeType;
  width: number;
  height: number;
  byteLength: number;
  data: Uint8Array;
};

export type BackupCard = {
  storeName: string;
  cardNumber: string;
  barcodeFormat: BarcodeFormat;
  backgroundColor?: string;
  isArchived?: boolean;
  isFavorite?: boolean;
  lastUsedAt?: string;
  notes?: string;
  images: BackupImage[];
};

export type BackupPayload = {
  payloadVersion: 2;
  exportedAt: string;
  cards: BackupCard[];
};

export type BackupPayloadSource = {
  payloadVersion: 2;
  exportedAt: string;
  cardCount: number;
  imageCount: number;
  totalDecodedBytes: number;
  cards: AsyncIterable<BackupCard>;
};

export type BackupPreview = {
  envelopeVersion: number;
  sourcePayloadVersion: number;
  currentPayloadVersion: 2;
  exportedAt: string;
  cardCount: number;
  imageCount: number;
  totalDecodedBytes: number;
};

export type BackupRestoreCandidate = {
  source: BackupDocumentSource;
  preview: BackupPreview;
};

export type BackupCardResult = {
  sourceIndex: number;
  storeName: string;
  status: "imported" | "skipped" | "failed";
  reason?: BackupErrorReason | "duplicate";
  message: string;
  retryable: boolean;
  importedCardId?: string;
};

export type BackupRestoreResult = {
  importedCardCount: number;
  skippedCardCount: number;
  failedCardCount: number;
  cards: BackupCardResult[];
};

export type BackupExportResult = {
  cardCount: number;
  imageCount: number;
  exportedAt: string;
};

export type BackupCryptoKey = {
  readonly material: unknown;
};

export type BackupCrypto = {
  randomBytes(length: number): Promise<Uint8Array>;
  deriveKey(passphrase: string, salt: Uint8Array, iterations: number): Promise<BackupCryptoKey>;
  encryptRecord(
    plaintext: Uint8Array,
    key: BackupCryptoKey,
    additionalData: Uint8Array,
    nonce?: Uint8Array
  ): Promise<Uint8Array>;
  decryptRecord(
    sealed: Uint8Array,
    key: BackupCryptoKey,
    additionalData: Uint8Array
  ): Promise<Uint8Array>;
};

export type BackupByteWriter = {
  write(bytes: Uint8Array): Promise<void>;
  close(): Promise<void>;
  abort(): Promise<void>;
};

export type BackupDocumentDestination = {
  writer: BackupByteWriter;
  commit(): Promise<void>;
  cleanup(): Promise<void>;
};

export type BackupDocumentSource = {
  name: string;
  size?: number;
  open(): Promise<ReadableStream<Uint8Array>>;
  cleanup(): Promise<void>;
};

export type BackupDocumentProvider = {
  createDestination(input: { suggestedName: string; estimatedBytes: number }): Promise<BackupDocumentDestination>;
  pickSource(): Promise<BackupDocumentSource>;
};

export type BundleCodec = {
  encode(payload: BackupPayload | BackupPayloadSource, targetPayloadVersion?: 1 | 2): AsyncIterable<Uint8Array>;
  decode(payloadVersion: number, records: AsyncIterable<Uint8Array>): Promise<BackupPayload>;
};

export type BackupService = {
  createBackup(passphrase: string): Promise<BackupExportResult>;
  selectAndPreviewRestore(passphrase: string): Promise<BackupRestoreCandidate>;
  restore(
    candidate: BackupRestoreCandidate,
    passphrase: string,
    options: { duplicateStrategy: DuplicateImportStrategy }
  ): Promise<BackupRestoreResult>;
};

export function backupError(
  reason: BackupErrorReason,
  message: string,
  options: Partial<Pick<BackupError, "retryable" | "cardIndex" | "imageIndex">> = {}
): BackupError {
  return {
    kind: "backup",
    reason,
    message,
    retryable: options.retryable ?? false,
    cardIndex: options.cardIndex,
    imageIndex: options.imageIndex
  };
}

export function isBackupError(value: unknown): value is BackupError {
  return Boolean(
    value &&
      typeof value === "object" &&
      (value as { kind?: unknown }).kind === "backup" &&
      typeof (value as { reason?: unknown }).reason === "string"
  );
}
