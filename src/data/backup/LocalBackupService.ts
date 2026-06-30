import type { CardRepository, CreateCardInput } from "../../domain/cards/CardRepository";
import type { LoyaltyCard } from "../../domain/cards/Card";
import type { ImageStore, StoredImage } from "../../domain/images/ImageStore";
import {
  BACKUP_LIMITS,
  backupError,
  isBackupError,
  type BackupCard,
  type BackupDocumentProvider,
  type BackupExportResult,
  type BackupPayloadSource,
  type BackupRestoreCandidate,
  type BackupRestoreResult,
  type BackupService
} from "../../domain/backup/Backup";
import type { DuplicateImportStrategy } from "../../domain/sharing/SharingPorts";
import type { StorageTransactionRunner } from "../storage/StorageTransactionRunner";
import { noStorageTransactionRunner } from "../storage/StorageTransactionRunner";

import { EncryptedBackupContainer } from "./EncryptedBackupContainer";
import { verifyImageMetadata } from "./imageMetadata";

function isDuplicate(card: BackupCard, existing: LoyaltyCard): boolean {
  return (
    existing.storeName.trim().toLocaleLowerCase() === card.storeName.trim().toLocaleLowerCase() &&
    existing.cardNumber.trim() === card.cardNumber.trim() &&
    existing.barcodeFormat === card.barcodeFormat
  );
}

function toCreateCardInput(card: BackupCard): CreateCardInput {
  return {
    storeName: card.storeName,
    cardNumber: card.cardNumber,
    barcodeFormat: card.barcodeFormat,
    backgroundColor: card.backgroundColor,
    isArchived: card.isArchived,
    isFavorite: card.isFavorite,
    lastUsedAt: card.lastUsedAt,
    notes: card.notes
  };
}

async function mapBounded<T, R>(
  values: readonly T[],
  concurrency: number,
  operation: (value: T, index: number) => Promise<R>
): Promise<R[]> {
  const results = new Array<R>(values.length);
  let next = 0;

  async function worker() {
    while (next < values.length) {
      const index = next++;
      results[index] = await operation(values[index], index);
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, values.length) }, () => worker()));
  return results;
}

export class LocalBackupService implements BackupService {
  constructor(
    private readonly cardRepository: CardRepository,
    private readonly imageStore: ImageStore,
    private readonly container: EncryptedBackupContainer,
    private readonly documentProvider: BackupDocumentProvider,
    private readonly transactionRunner: StorageTransactionRunner = noStorageTransactionRunner
  ) {}

  async createBackup(passphrase: string): Promise<BackupExportResult> {
    const payload = await this.buildPayloadSource();
    const destination = await this.documentProvider.createDestination({
      suggestedName: `loyalty-card-wallet-${payload.exportedAt.slice(0, 10)}.lcwb`,
      estimatedBytes:
        payload.totalDecodedBytes + payload.cardCount * 2_048 + payload.imageCount * 512 + 16_384
    });

    try {
      await this.container.write(payload, passphrase, destination.writer);
      await destination.writer.close();
      await destination.commit();
      return { cardCount: payload.cardCount, imageCount: payload.imageCount, exportedAt: payload.exportedAt };
    } catch (error) {
      await destination.writer.abort();
      if (isBackupError(error)) throw error;
      throw backupError("writeFailed", "Encrypted backup could not be created.", { retryable: true });
    } finally {
      await destination.cleanup();
    }
  }

  async selectAndPreviewRestore(passphrase: string): Promise<BackupRestoreCandidate> {
    const source = await this.documentProvider.pickSource();
    try {
      if (source.size && source.size > BACKUP_LIMITS.maxDecodedBytes * 1.5) {
        throw backupError("oversizedWallet", "Selected backup file exceeds the supported size.");
      }
      const decoded = await this.container.read(await source.open(), passphrase);
      const imageCount = decoded.payload.cards.reduce((total, card) => total + card.images.length, 0);
      const totalDecodedBytes = decoded.payload.cards.reduce(
        (total, card) => total + card.images.reduce((sum, image) => sum + image.byteLength, 0),
        0
      );
      return {
        source,
        preview: {
          envelopeVersion: decoded.envelopeVersion,
          sourcePayloadVersion: decoded.sourcePayloadVersion,
          currentPayloadVersion: decoded.payload.payloadVersion,
          exportedAt: decoded.payload.exportedAt,
          cardCount: decoded.payload.cards.length,
          imageCount,
          totalDecodedBytes
        }
      };
    } catch (error) {
      await source.cleanup();
      throw error;
    }
  }

  async restore(
    candidate: BackupRestoreCandidate,
    passphrase: string,
    options: { duplicateStrategy: DuplicateImportStrategy }
  ): Promise<BackupRestoreResult> {
    try {
      const decoded = await this.container.read(await candidate.source.open(), passphrase);
      const result: BackupRestoreResult = {
        importedCardCount: 0,
        skippedCardCount: 0,
        failedCardCount: 0,
        cards: []
      };

      for (const [sourceIndex, card] of decoded.payload.cards.entries()) {
        try {
          const imported = await this.transactionRunner.run(() =>
            this.importCard(card, options.duplicateStrategy)
          );
          if (!imported) {
            result.skippedCardCount += 1;
            result.cards.push({
              sourceIndex,
              storeName: card.storeName,
              status: "skipped",
              reason: "duplicate",
              message: "Skipped an existing duplicate card.",
              retryable: false
            });
          } else {
            result.importedCardCount += 1;
            result.cards.push({
              sourceIndex,
              storeName: card.storeName,
              status: "imported",
              message: "Card restored.",
              retryable: false,
              importedCardId: imported
            });
          }
        } catch (error) {
          const reason = isBackupError(error) ? error.reason : "writeFailed";
          result.failedCardCount += 1;
          result.cards.push({
            sourceIndex,
            storeName: card.storeName,
            status: "failed",
            reason,
            message: "Card could not be restored.",
            retryable: true
          });
        }
      }

      return result;
    } finally {
      await candidate.source.cleanup();
    }
  }

  private async buildPayloadSource(): Promise<BackupPayloadSource> {
    const cards = await this.cardRepository.list();
    if (cards.length > BACKUP_LIMITS.maxCards) {
      throw backupError("oversizedWallet", "Wallet contains more cards than the backup limit.");
    }

    const metadataByCard: StoredImage[][] = [];
    let imageCount = 0;
    let totalDecodedBytes = 0;

    for (const card of cards) {
      const metadata = await this.imageStore.listForCard(card.id);
      metadataByCard.push(metadata);
      imageCount += metadata.length;
      if (imageCount > BACKUP_LIMITS.maxImages) {
        throw backupError("oversizedWallet", "Wallet contains more images than the backup limit.");
      }

      for (const [imageIndex, image] of metadata.entries()) {
        if (image.byteLength > BACKUP_LIMITS.maxImageBytes) {
          throw backupError("oversizedImage", "A wallet image exceeds the backup size limit.", { imageIndex });
        }
        totalDecodedBytes += image.byteLength;
      }
      if (totalDecodedBytes > BACKUP_LIMITS.maxDecodedBytes) {
        throw backupError("oversizedWallet", "Wallet images exceed the backup decoded-size limit.");
      }
    }

    const self = this;
    async function* backupCards(): AsyncIterable<BackupCard> {
      for (const [cardIndex, card] of cards.entries()) {
        const images = await mapBounded(
          metadataByCard[cardIndex],
          BACKUP_LIMITS.imageConcurrency,
          (image, imageIndex) => self.loadImage(image, card.id, imageIndex)
        );
        yield {
          storeName: card.storeName,
          cardNumber: card.cardNumber,
          barcodeFormat: card.barcodeFormat,
          backgroundColor: card.backgroundColor,
          isArchived: card.isArchived,
          isFavorite: card.isFavorite,
          lastUsedAt: card.lastUsedAt,
          notes: card.notes,
          images
        };
      }
    }

    return {
      payloadVersion: 2,
      exportedAt: new Date().toISOString(),
      cardCount: cards.length,
      imageCount,
      totalDecodedBytes,
      cards: backupCards()
    };
  }

  private async loadImage(image: StoredImage, cardId: string, imageIndex: number) {
    if (image.byteLength > BACKUP_LIMITS.maxImageBytes) {
      throw backupError("oversizedImage", "A wallet image exceeds the backup size limit.", { imageIndex });
    }
    const payload = await this.imageStore.getImage(image.id);
    if (!payload || payload.metadata.cardId !== cardId || payload.data.byteLength !== image.byteLength) {
      throw backupError("invalidImage", "A private image payload is missing or inconsistent.", { imageIndex });
    }
    const verified = verifyImageMetadata(payload.data, image.mimeType, {
      width: image.width,
      height: image.height
    });
    return {
      role: image.role,
      ...verified,
      byteLength: payload.data.byteLength,
      data: payload.data
    };
  }

  private async importCard(card: BackupCard, duplicateStrategy: DuplicateImportStrategy): Promise<string | null> {
    const existing = await this.cardRepository.list();
    const duplicates = existing.filter((candidate) => isDuplicate(card, candidate));
    if (duplicates.length && duplicateStrategy === "skip") return null;

    const created = await this.cardRepository.create(toCreateCardInput(card));
    try {
      let primaryImageId: string | undefined;
      for (const image of card.images) {
        const verified = verifyImageMetadata(image.data, image.mimeType, {
          width: image.width,
          height: image.height
        });
        const saved = await this.imageStore.saveImage({
          cardId: created.id,
          role: image.role,
          mimeType: image.mimeType,
          width: verified.width,
          height: verified.height,
          data: image.data
        });
        if (image.role === "primary" && !primaryImageId) primaryImageId = saved.id;
      }
      if (primaryImageId) await this.cardRepository.update(created.id, { primaryImageId });
    } catch (error) {
      await this.cardRepository.delete(created.id);
      await this.imageStore.deleteUnreferencedPayloads();
      throw error;
    }

    if (duplicates.length && duplicateStrategy === "replace") {
      for (const duplicate of duplicates) await this.cardRepository.delete(duplicate.id);
      await this.imageStore.deleteUnreferencedPayloads();
    }
    return created.id;
  }
}
