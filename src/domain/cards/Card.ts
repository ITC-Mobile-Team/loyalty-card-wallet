export type BarcodeFormat = "code128" | "code39" | "ean13" | "ean8" | "upca" | "upce" | "itf" | "qr";

export type Card = {
  id: string;
  storeName: string;
  cardNumber: string;
  barcodeFormat: BarcodeFormat;
  isArchived?: boolean;
  isFavorite?: boolean;
  lastUsedAt?: string;
  primaryImageId?: string;
  thumbnailImageId?: string;
  backgroundColor?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
};

export type LoyaltyCard = Card;

export const BARCODE_FORMATS: readonly BarcodeFormat[] = [
  "code128",
  "code39",
  "ean13",
  "ean8",
  "upca",
  "upce",
  "itf",
  "qr"
];

export function isBarcodeFormat(value: string): value is BarcodeFormat {
  return BARCODE_FORMATS.includes(value as BarcodeFormat);
}
