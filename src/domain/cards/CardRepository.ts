import type { BarcodeFormat, LoyaltyCard } from "./Card";

export type CreateCardInput = {
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
};

export type UpdateCardInput = Partial<CreateCardInput>;

export type CardRepository = {
  list(): Promise<LoyaltyCard[]>;
  getById(id: string): Promise<LoyaltyCard | null>;
  create(input: CreateCardInput): Promise<LoyaltyCard>;
  update(id: string, input: UpdateCardInput): Promise<LoyaltyCard | null>;
  delete(id: string): Promise<void>;
};
