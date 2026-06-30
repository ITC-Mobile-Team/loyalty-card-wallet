import type { BarcodeFormat } from "../cards/Card";
import type { ImageMimeType, ImageRole } from "../images/ImageStore";

export type ExportBundleSummary = {
  cardCount: number;
  createdAt: string;
};

export type ExportedImage = {
  role: ImageRole;
  mimeType: ImageMimeType;
  data: string;
};

export type ExportedCard = {
  storeName: string;
  cardNumber: string;
  barcodeFormat: BarcodeFormat;
  backgroundColor?: string;
  isArchived?: boolean;
  isFavorite?: boolean;
  lastUsedAt?: string;
  notes?: string;
  images?: ExportedImage[];
};

export type ExportBundle = {
  app: "loyalty-card-wallet";
  formatVersion: 1;
  exportedAt: string;
  cards: ExportedCard[];
};

export type ExportCardsOptions = {
  cardIds?: string[];
  includeImages?: boolean;
};

export type ImportBundlePreview = {
  cardCount: number;
  duplicateCardCount: number;
  imageCount: number;
  formatVersion: number;
};

export type DuplicateImportStrategy = "skip" | "replace" | "keepBoth";

export type ImportBundleOptions = {
  duplicateStrategy: DuplicateImportStrategy;
};

export type ImportBundleResult = {
  importedCardCount: number;
  skippedCardCount: number;
  failedCardCount: number;
  importedCardIds?: string[];
  errors: string[];
};

export type SharingService = {
  getLastExportSummary(): Promise<ExportBundleSummary | null>;
  exportCards(options?: ExportCardsOptions): Promise<ExportBundle>;
  previewImportBundle(bundle: unknown): Promise<ImportBundlePreview>;
  importBundle(bundle: unknown, options: ImportBundleOptions): Promise<ImportBundleResult>;
};
