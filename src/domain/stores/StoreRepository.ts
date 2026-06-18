export type StoreSearchOrigin =
  | {
      city: string;
      kind: "city";
    }
  | {
      kind: "nearby";
      latitude: number;
      longitude: number;
      radiusMeters: number;
    };

export type StoreSearchQuery = {
  origin: StoreSearchOrigin;
  searchTerm?: string;
};

export type StoreSummary = {
  address?: string;
  brand?: string;
  category?: string;
  id: string;
  latitude?: number;
  longitude?: number;
  name: string;
  openingHours?: string;
  operator?: string;
  phone?: string;
  source: "openstreetmap";
  website?: string;
};

export type StoreSearchResult = {
  sourceAttribution: string;
  stores: StoreSummary[];
  total: number;
};

export type StoreRepository = {
  getCachedById(id: string): Promise<StoreSummary | null>;
  search(query: StoreSearchQuery): Promise<StoreSearchResult>;
};
