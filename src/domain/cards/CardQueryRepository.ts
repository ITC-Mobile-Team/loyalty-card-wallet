import type { BarcodeFormat, LoyaltyCard } from "./Card";

export type CardSort = "alphabetical" | "recent";

export type CardQuery = {
  archived?: boolean;
  favoriteOnly?: boolean;
  limit?: number;
  offset?: number;
  search?: string;
  sort?: CardSort;
};

export type CardQueryPage = {
  cards: LoyaltyCard[];
  hasMore: boolean;
  total: number;
};

export type CardDuplicateKey = {
  barcodeFormat: BarcodeFormat;
  cardNumber: string;
  storeName: string;
};

export type CardQueryRepository = {
  findDuplicateIds(keys: readonly CardDuplicateKey[]): Promise<Map<string, string>>;
  query(query: CardQuery): Promise<CardQueryPage>;
};

export function createCardDuplicateKey(input: CardDuplicateKey): string {
  return [
    normalizeDuplicatePart(input.storeName),
    input.barcodeFormat,
    normalizeDuplicatePart(input.cardNumber)
  ].join("|");
}

function normalizeDuplicatePart(value: string): string {
  return value.trim().toLocaleLowerCase().replace(/[\s-]+/g, "");
}
