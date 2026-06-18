import { isBarcodeFormat, type LoyaltyCard } from "../../domain/cards/Card";
import type { CardRepository, CreateCardInput } from "../../domain/cards/CardRepository";
import type { ImageStore, SaveImageInput, StoredImage } from "../../domain/images/ImageStore";
import type {
  ExportBundle,
  ExportBundleSummary,
  ExportCardsOptions,
  ExportedCard,
  ImportBundleOptions,
  ImportBundlePreview,
  ImportBundleResult,
  SharingService
} from "../../domain/sharing/SharingPorts";
import { toImportExportAppError } from "../../core/errors/AppError";
import type { StorageTransactionRunner } from "../storage/StorageTransactionRunner";
import { noStorageTransactionRunner } from "../storage/StorageTransactionRunner";
import { base64ToBytes, bytesToBase64 } from "./base64";
import type { ExportMetadataStore } from "./ExportMetadataStore";

const APP_ID = "loyalty-card-wallet";
const FORMAT_VERSION = 1;

function assertObject(value: unknown, message: string): asserts value is Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw { kind: "validation", message };
  }
}

function validateBundle(bundle: unknown): ExportBundle {
  assertObject(bundle, "Import bundle must be an object.");

  if (bundle.app !== APP_ID) {
    throw { kind: "importExport", message: "Import bundle was not created by Loyalty Card Wallet." };
  }

  if (typeof bundle.formatVersion !== "number") {
    throw { kind: "validation", field: "formatVersion", message: "Import bundle format version is required." };
  }

  if (bundle.formatVersion > FORMAT_VERSION) {
    throw { kind: "importExport", message: "Import bundle was created by a newer app version." };
  }

  if (bundle.formatVersion !== FORMAT_VERSION) {
    throw { kind: "importExport", message: "Import bundle format version is not supported." };
  }

  if (!Array.isArray(bundle.cards)) {
    throw { kind: "validation", field: "cards", message: "Import bundle cards must be an array." };
  }

  return {
    app: APP_ID,
    formatVersion: FORMAT_VERSION,
    exportedAt: typeof bundle.exportedAt === "string" ? bundle.exportedAt : new Date().toISOString(),
    cards: bundle.cards.map(validateExportedCard)
  };
}

function validateExportedCard(value: unknown): ExportedCard {
  assertObject(value, "Imported card must be an object.");

  if (typeof value.storeName !== "string" || !value.storeName.trim()) {
    throw { kind: "validation", field: "storeName", message: "Imported card store name is required." };
  }

  if (typeof value.cardNumber !== "string" || !value.cardNumber.trim()) {
    throw { kind: "validation", field: "cardNumber", message: "Imported card number is required." };
  }

  if (typeof value.barcodeFormat !== "string" || !isBarcodeFormat(value.barcodeFormat)) {
    throw { kind: "validation", field: "barcodeFormat", message: "Imported card barcode format is not supported." };
  }

  if (value.images !== undefined && !Array.isArray(value.images)) {
    throw { kind: "validation", field: "images", message: "Imported card images must be an array." };
  }

  return {
    storeName: value.storeName,
    cardNumber: value.cardNumber,
    barcodeFormat: value.barcodeFormat,
    backgroundColor: typeof value.backgroundColor === "string" ? value.backgroundColor : undefined,
    notes: typeof value.notes === "string" ? value.notes : undefined,
    images: value.images?.map((image) => {
      assertObject(image, "Imported image must be an object.");

      if (image.role !== "primary" && image.role !== "additional") {
        throw { kind: "validation", field: "role", message: "Imported image role is not supported." };
      }

      if (image.mimeType !== "image/jpeg" && image.mimeType !== "image/png" && image.mimeType !== "image/webp") {
        throw { kind: "validation", field: "mimeType", message: "Imported image MIME type is not supported." };
      }

      if (typeof image.data !== "string") {
        throw { kind: "validation", field: "data", message: "Imported image data is required." };
      }

      return {
        role: image.role,
        mimeType: image.mimeType,
        data: image.data
      };
    })
  };
}

function isDuplicate(card: ExportedCard, existingCard: LoyaltyCard): boolean {
  return (
    existingCard.storeName.trim().toLocaleLowerCase() === card.storeName.trim().toLocaleLowerCase() &&
    existingCard.cardNumber.trim() === card.cardNumber.trim() &&
    existingCard.barcodeFormat === card.barcodeFormat
  );
}

function toCreateCardInput(card: ExportedCard): CreateCardInput {
  return {
    storeName: card.storeName,
    cardNumber: card.cardNumber,
    barcodeFormat: card.barcodeFormat,
    backgroundColor: card.backgroundColor,
    notes: card.notes
  };
}

function dimensionsForImportedImage(data: Uint8Array): Pick<SaveImageInput, "width" | "height"> {
  return {
    width: Math.max(1, data.byteLength),
    height: 1
  };
}

type ImportOneCardResult = { status: "imported"; cardId: string } | { status: "skipped" };

export class LocalSharingService implements SharingService {
  constructor(
    private readonly cardRepository: CardRepository,
    private readonly imageStore: ImageStore,
    private readonly metadataStore?: ExportMetadataStore,
    private readonly transactionRunner: StorageTransactionRunner = noStorageTransactionRunner
  ) {}

  async getLastExportSummary(): Promise<ExportBundleSummary | null> {
    return this.metadataStore?.getLastExportSummary() ?? null;
  }

  async exportCards(options: ExportCardsOptions = {}): Promise<ExportBundle> {
    try {
      const exportedAt = new Date().toISOString();
      const allCards = await this.cardRepository.list();
      const selectedCards = options.cardIds
        ? allCards.filter((card) => options.cardIds?.includes(card.id))
        : allCards;
      const cards = await Promise.all(
        selectedCards.map((card) => this.exportCard(card, options.includeImages !== false))
      );

      const bundle: ExportBundle = {
        app: APP_ID,
        formatVersion: FORMAT_VERSION,
        exportedAt,
        cards
      };

      await this.metadataStore?.setLastExportSummary({
        cardCount: bundle.cards.length,
        createdAt: exportedAt
      });

      return bundle;
    } catch (error) {
      throw toImportExportAppError(error);
    }
  }

  async previewImportBundle(bundle: unknown): Promise<ImportBundlePreview> {
    try {
      const validatedBundle = validateBundle(bundle);
      const existingCards = await this.cardRepository.list();

      return {
        cardCount: validatedBundle.cards.length,
        duplicateCardCount: validatedBundle.cards.filter((card) =>
          existingCards.some((existingCard) => isDuplicate(card, existingCard))
        ).length,
        imageCount: validatedBundle.cards.reduce((count, card) => count + (card.images?.length ?? 0), 0),
        formatVersion: validatedBundle.formatVersion
      };
    } catch (error) {
      throw toImportExportAppError(error);
    }
  }

  async importBundle(bundle: unknown, options: ImportBundleOptions): Promise<ImportBundleResult> {
    try {
      const validatedBundle = validateBundle(bundle);
      const result: ImportBundleResult = {
        importedCardCount: 0,
        skippedCardCount: 0,
        failedCardCount: 0,
        errors: []
      };

      for (const exportedCard of validatedBundle.cards) {
        try {
          const importResult = await this.transactionRunner.run(() => this.importOneCard(exportedCard, options));

          if (importResult.status === "skipped") {
            result.skippedCardCount += 1;
            continue;
          }

          result.importedCardCount += 1;
          result.importedCardIds = [...(result.importedCardIds ?? []), importResult.cardId];
        } catch (error) {
          result.failedCardCount += 1;
          result.errors.push(error instanceof Error ? error.message : "Failed to import a card.");
        }
      }

      return result;
    } catch (error) {
      throw toImportExportAppError(error);
    }
  }

  private async importOneCard(
    exportedCard: ExportedCard,
    options: ImportBundleOptions
  ): Promise<ImportOneCardResult> {
    const existingCards = await this.cardRepository.list();
    const duplicates = existingCards.filter((card) => isDuplicate(exportedCard, card));

    if (duplicates.length > 0 && options.duplicateStrategy === "skip") {
      return { status: "skipped" };
    }

    const card = await this.cardRepository.create(toCreateCardInput(exportedCard));

    try {
      const images = exportedCard.images ?? [];
      let primaryImageId: string | undefined;

      for (const image of images) {
        const data = base64ToBytes(image.data);
        const savedImage = await this.imageStore.saveImage({
          cardId: card.id,
          role: image.role,
          mimeType: image.mimeType,
          data,
          ...dimensionsForImportedImage(data)
        });

        if (image.role === "primary" && !primaryImageId) {
          primaryImageId = savedImage.id;
        }
      }

      if (primaryImageId) {
        await this.cardRepository.update(card.id, { primaryImageId });
      }
    } catch (cardImportError) {
      await this.cardRepository.delete(card.id);
      await this.imageStore.deleteUnreferencedPayloads();
      throw cardImportError;
    }

    if (duplicates.length > 0 && options.duplicateStrategy === "replace") {
      await Promise.all(duplicates.map((duplicate) => this.cardRepository.delete(duplicate.id)));
      await this.imageStore.deleteUnreferencedPayloads();
    }

    return { status: "imported", cardId: card.id };
  }

  private async exportCard(card: LoyaltyCard, includeImages: boolean): Promise<ExportedCard> {
    const exportedCard: ExportedCard = {
      storeName: card.storeName,
      cardNumber: card.cardNumber,
      barcodeFormat: card.barcodeFormat,
      backgroundColor: card.backgroundColor,
      notes: card.notes
    };

    if (!includeImages) {
      return exportedCard;
    }

    const images = await this.imageStore.listForCard(card.id);
    const exportedImages = await Promise.all(images.map((image) => this.exportImage(image)));

    if (exportedImages.length > 0) {
      exportedCard.images = exportedImages;
    }

    return exportedCard;
  }

  private async exportImage(image: StoredImage): Promise<NonNullable<ExportedCard["images"]>[number]> {
    const payload = await this.imageStore.getImage(image.id);

    if (!payload) {
      throw { kind: "storage", message: "Image metadata points to a missing private payload." };
    }

    return {
      role: payload.metadata.role,
      mimeType: payload.metadata.mimeType,
      data: bytesToBase64(payload.data)
    };
  }
}
