import { base64ToBytes, bytesToBase64 } from "../../core/encoding/base64";
import {
  BACKUP_LIMITS,
  CURRENT_BACKUP_PAYLOAD_VERSION,
  backupError,
  type BackupCard,
  type BackupPayload,
  type BackupPayloadSource,
  type BundleCodec
} from "../../domain/backup/Backup";
import { isBarcodeFormat } from "../../domain/cards/Card";

import { textDecoder, textEncoder } from "./backupBytes";
import { verifyImageMetadata } from "./imageMetadata";

type ManifestRecord = {
  type: "manifest";
  exportedAt: string;
  cardCount: number;
  imageCount: number;
};

type CardRecord = Omit<BackupCard, "images"> & {
  type: "card";
  cardIndex: number;
  imageCount: number;
};

function parseObject(bytes: Uint8Array): Record<string, unknown> {
  if (bytes.byteLength > BACKUP_LIMITS.maxRecordBytes) {
    throw backupError("oversizedWallet", "Backup record exceeds the supported size.");
  }

  try {
    const value: unknown = JSON.parse(textDecoder.decode(bytes));
    if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error();
    return value as Record<string, unknown>;
  } catch {
    throw backupError("invalidPayload", "Backup contains an invalid logical record.");
  }
}

function parseManifest(value: Record<string, unknown>): ManifestRecord {
  if (
    value.type !== "manifest" ||
    typeof value.exportedAt !== "string" ||
    !Number.isInteger(value.cardCount) ||
    !Number.isInteger(value.imageCount)
  ) {
    throw backupError("invalidPayload", "Backup manifest is invalid.");
  }

  const cardCount = Number(value.cardCount);
  const imageCount = Number(value.imageCount);
  if (cardCount < 0 || cardCount > BACKUP_LIMITS.maxCards || imageCount < 0 || imageCount > BACKUP_LIMITS.maxImages) {
    throw backupError("oversizedWallet", "Backup exceeds the supported card or image count.");
  }

  return { type: "manifest", exportedAt: value.exportedAt, cardCount, imageCount };
}

function isPayloadSource(payload: BackupPayload | BackupPayloadSource): payload is BackupPayloadSource {
  return !Array.isArray(payload.cards);
}

function parseCard(value: Record<string, unknown>, expectedIndex: number): CardRecord {
  if (
    value.type !== "card" ||
    value.cardIndex !== expectedIndex ||
    typeof value.storeName !== "string" ||
    !value.storeName.trim() ||
    typeof value.cardNumber !== "string" ||
    !value.cardNumber.trim() ||
    typeof value.barcodeFormat !== "string" ||
    !isBarcodeFormat(value.barcodeFormat) ||
    !Number.isInteger(value.imageCount)
  ) {
    throw backupError("invalidPayload", "Backup card record is invalid.", { cardIndex: expectedIndex });
  }

  const imageCount = Number(value.imageCount);
  if (imageCount < 0 || imageCount > BACKUP_LIMITS.maxImages) {
    throw backupError("oversizedWallet", "Backup card contains too many images.", { cardIndex: expectedIndex });
  }

  return {
    type: "card",
    cardIndex: expectedIndex,
    imageCount,
    storeName: value.storeName,
    cardNumber: value.cardNumber,
    barcodeFormat: value.barcodeFormat,
    backgroundColor: typeof value.backgroundColor === "string" ? value.backgroundColor : undefined,
    isArchived: typeof value.isArchived === "boolean" ? value.isArchived : undefined,
    isFavorite: typeof value.isFavorite === "boolean" ? value.isFavorite : undefined,
    lastUsedAt: typeof value.lastUsedAt === "string" ? value.lastUsedAt : undefined,
    notes: typeof value.notes === "string" ? value.notes : undefined
  };
}

function parseImage(
  value: Record<string, unknown>,
  payloadVersion: number,
  cardIndex: number,
  imageIndex: number
): BackupCard["images"][number] {
  if (
    value.type !== "image" ||
    value.cardIndex !== cardIndex ||
    value.imageIndex !== imageIndex ||
    (value.role !== "primary" && value.role !== "additional") ||
    (value.mimeType !== "image/jpeg" && value.mimeType !== "image/png" && value.mimeType !== "image/webp") ||
    typeof value.data !== "string" ||
    !Number.isInteger(value.byteLength)
  ) {
    throw backupError("invalidPayload", "Backup image record is invalid.", { cardIndex, imageIndex });
  }

  const byteLength = Number(value.byteLength);
  if (byteLength <= 0 || byteLength > BACKUP_LIMITS.maxImageBytes) {
    throw backupError("oversizedImage", "Backup image exceeds the supported size.", { cardIndex, imageIndex });
  }

  const data = base64ToBytes(value.data);
  if (data.byteLength !== byteLength) {
    throw backupError("invalidImage", "Backup image byte length does not match its record.", { cardIndex, imageIndex });
  }

  const declaredDimensions =
    payloadVersion >= 2 && Number.isInteger(value.width) && Number.isInteger(value.height)
      ? { width: Number(value.width), height: Number(value.height) }
      : undefined;

  if (payloadVersion >= 2 && !declaredDimensions) {
    throw backupError("invalidImage", "Backup image dimensions are required.", { cardIndex, imageIndex });
  }

  const metadata = verifyImageMetadata(data, value.mimeType, declaredDimensions);
  return { role: value.role, ...metadata, byteLength, data };
}

export class JsonBundleCodec implements BundleCodec {
  async *encode(
    payload: BackupPayload | BackupPayloadSource,
    targetPayloadVersion: 1 | 2 = 2
  ): AsyncIterable<Uint8Array> {
    const source = isPayloadSource(payload);
    const cardCount = source ? payload.cardCount : payload.cards.length;
    const imageCount = source
      ? payload.imageCount
      : payload.cards.reduce((total, card) => total + card.images.length, 0);
    const totalDecodedBytes = source
      ? payload.totalDecodedBytes
      : payload.cards.reduce(
          (total, card) => total + card.images.reduce((imageTotal, image) => imageTotal + image.byteLength, 0),
          0
        );
    const recordCount = 2 + cardCount + imageCount;

    yield textEncoder.encode(
      JSON.stringify({ type: "manifest", exportedAt: payload.exportedAt, cardCount, imageCount })
    );

    let cardIndex = 0;
    let encodedImages = 0;
    let encodedBytes = 0;
    for await (const card of payload.cards) {
      const { images, ...fields } = card;
      yield textEncoder.encode(JSON.stringify({ type: "card", cardIndex, imageCount: images.length, ...fields }));

      for (const [imageIndex, image] of images.entries()) {
        encodedImages += 1;
        encodedBytes += image.byteLength;
        yield textEncoder.encode(
          JSON.stringify({
            type: "image",
            cardIndex,
            imageIndex,
            role: image.role,
            mimeType: image.mimeType,
            ...(targetPayloadVersion >= 2 ? { width: image.width, height: image.height } : {}),
            byteLength: image.byteLength,
            data: bytesToBase64(image.data)
          })
        );
      }
      cardIndex += 1;
    }

    if (cardIndex !== cardCount || encodedImages !== imageCount || encodedBytes !== totalDecodedBytes) {
      throw backupError("invalidPayload", "Backup source totals changed while records were being encoded.");
    }

    yield textEncoder.encode(JSON.stringify({ type: "end", recordCount, totalDecodedBytes }));
  }

  async decode(payloadVersion: number, records: AsyncIterable<Uint8Array>): Promise<BackupPayload> {
    if (payloadVersion > CURRENT_BACKUP_PAYLOAD_VERSION) {
      throw backupError("futurePayload", "Backup payload was created by a newer app version.");
    }
    if (payloadVersion !== 1 && payloadVersion !== 2) {
      throw backupError("unsupportedPayload", "Backup payload version is not supported.");
    }

    const iterator = records[Symbol.asyncIterator]();
    const first = await iterator.next();
    if (first.done) throw backupError("truncated", "Backup ended before its manifest.");
    const manifest = parseManifest(parseObject(first.value));
    const cards: BackupCard[] = [];
    let recordCount = 1;
    let imageCount = 0;
    let totalDecodedBytes = 0;

    for (let cardIndex = 0; cardIndex < manifest.cardCount; cardIndex += 1) {
      const cardStep = await iterator.next();
      if (cardStep.done) throw backupError("truncated", "Backup ended before all card records were read.");
      const cardRecord = parseCard(parseObject(cardStep.value), cardIndex);
      recordCount += 1;
      const images: BackupCard["images"] = [];

      for (let imageIndex = 0; imageIndex < cardRecord.imageCount; imageIndex += 1) {
        const imageStep = await iterator.next();
        if (imageStep.done) throw backupError("truncated", "Backup ended before all image records were read.");
        const image = parseImage(parseObject(imageStep.value), payloadVersion, cardIndex, imageIndex);
        images.push(image);
        recordCount += 1;
        imageCount += 1;
        totalDecodedBytes += image.byteLength;

        if (imageCount > BACKUP_LIMITS.maxImages || totalDecodedBytes > BACKUP_LIMITS.maxDecodedBytes) {
          throw backupError("oversizedWallet", "Backup decoded size exceeds the supported limit.");
        }
      }

      const { type: _type, cardIndex: _cardIndex, imageCount: _imageCount, ...card } = cardRecord;
      cards.push({ ...card, images });
    }

    const endStep = await iterator.next();
    if (endStep.done) throw backupError("truncated", "Backup is missing its authenticated end record.");
    const end = parseObject(endStep.value);
    recordCount += 1;

    if (
      end.type !== "end" ||
      end.recordCount !== recordCount ||
      end.totalDecodedBytes !== totalDecodedBytes ||
      imageCount !== manifest.imageCount
    ) {
      throw backupError("truncated", "Backup end record does not match the decoded content.");
    }

    const trailing = await iterator.next();
    if (!trailing.done) throw backupError("invalidPayload", "Backup contains trailing logical records.");

    return {
      payloadVersion: CURRENT_BACKUP_PAYLOAD_VERSION,
      exportedAt: manifest.exportedAt,
      cards
    };
  }
}
