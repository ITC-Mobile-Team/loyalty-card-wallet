export type MerchantCatalogEntry = {
  aliases: readonly string[];
  category: string;
  defaultBackgroundColor: string;
  id: string;
  name: string;
};

export type MerchantCatalogSearchResult = MerchantCatalogEntry & {
  matchedAlias?: string;
};

export type MerchantCatalogOverride = {
  aliases: readonly string[];
  artworkImageId?: string;
  merchantId: string;
  updatedAt: string;
};

export type MerchantCatalogRepository = {
  getById(id: string): Promise<MerchantCatalogEntry | null>;
  saveOverride(input: Omit<MerchantCatalogOverride, "updatedAt">): Promise<MerchantCatalogOverride>;
  search(query: string, limit?: number): Promise<MerchantCatalogSearchResult[]>;
  version(): number;
};
