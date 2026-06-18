import { networkErrorToAppError, type HttpClient, type NetworkError } from "../../core/network/HttpClient";
import type { StoreRepository, StoreSearchQuery, StoreSearchResult, StoreSummary } from "../../domain/stores/StoreRepository";

const endpoints = [
  "https://overpass-api.de/api/interpreter"
] as const;
const maxResults = 120;
const sourceAttribution = "Store data from OpenStreetMap contributors, available under ODbL.";

type OverpassElement = {
  center?: {
    lat?: number;
    lon?: number;
  };
  id: number;
  lat?: number;
  lon?: number;
  tags?: Record<string, string | undefined>;
  type: "node" | "relation" | "way";
};

type OverpassResponse = {
  elements?: OverpassElement[];
};

export class OverpassStoreRepository implements StoreRepository {
  private readonly cache = new Map<string, StoreSummary[]>();

  constructor(
    private readonly httpClient: HttpClient,
    private readonly endpointUrls: readonly string[] = endpoints
  ) {}

  async getCachedById(id: string): Promise<StoreSummary | null> {
    for (const stores of this.cache.values()) {
      const store = stores.find((candidate) => candidate.id === id);

      if (store) {
        return store;
      }
    }

    return null;
  }

  async search(query: StoreSearchQuery): Promise<StoreSearchResult> {
    try {
      const allStores = await this.loadStores(query);
      const filteredStores = filterStores(allStores, query.searchTerm);

      return {
        sourceAttribution,
        stores: filteredStores,
        total: filteredStores.length
      };
    } catch (error) {
      if (isNetworkError(error)) {
        throw networkErrorToAppError(error);
      }

      throw error;
    }
  }

  private async loadStores(query: StoreSearchQuery) {
    const key = getOriginCacheKey(query);
    const cachedStores = this.cache.get(key);

    if (cachedStores) {
      return cachedStores;
    }

    const response = await this.requestStores(query);

    const stores = mapElements(response.body.elements ?? []);
    this.cache.set(key, stores);

    return stores;
  }

  private async requestStores(query: StoreSearchQuery) {
    let lastRetryableError: NetworkError | null = null;

    for (const endpointUrl of this.endpointUrls) {
      try {
        return await this.httpClient.request<OverpassResponse>({
          body: buildRequestBody(query),
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            "User-Agent": "loyalty-card-wallet/1.0"
          },
          method: "POST",
          timeoutMs: 30000,
          url: endpointUrl
        });
      } catch (error) {
        if (!isNetworkError(error) || !error.retryable) {
          throw error;
        }

        lastRetryableError = error;
      }
    }

    throw lastRetryableError ?? new Error("Store search failed.");
  }
}

function buildRequestBody(query: StoreSearchQuery) {
  return `data=${encodeURIComponent(buildOverpassQuery(query))}`;
}

function buildOverpassQuery(query: StoreSearchQuery) {
  if (query.origin.kind === "nearby") {
    const radius = Math.max(250, Math.min(query.origin.radiusMeters, 5000));

    return `[out:json][timeout:25];
(
  node["shop"](around:${radius},${query.origin.latitude},${query.origin.longitude});
  way["shop"](around:${radius},${query.origin.latitude},${query.origin.longitude});
  relation["shop"](around:${radius},${query.origin.latitude},${query.origin.longitude});
);
out center tags ${maxResults};`;
  }

  const city = escapeOverpassRegex(query.origin.city.trim());

  return `[out:json][timeout:25];
(
  relation["boundary"="administrative"]["name"~"^${city}$",i];
  relation["boundary"="administrative"]["name:en"~"^${city}$",i];
  relation["boundary"="administrative"]["int_name"~"^${city}$",i];
);
map_to_area->.searchArea;
(
  node["shop"](area.searchArea);
  way["shop"](area.searchArea);
  relation["shop"](area.searchArea);
);
out center tags ${maxResults};`;
}

function getOriginCacheKey(query: StoreSearchQuery) {
  if (query.origin.kind === "city") {
    return `city:${query.origin.city.trim().toLocaleLowerCase()}`;
  }

  return [
    "nearby",
    query.origin.latitude.toFixed(3),
    query.origin.longitude.toFixed(3),
    query.origin.radiusMeters
  ].join(":");
}

function mapElements(elements: OverpassElement[]): StoreSummary[] {
  return elements
    .map((element): StoreSummary | null => {
      const name = element.tags?.name ?? element.tags?.brand ?? element.tags?.operator;

      if (!name) {
        return null;
      }

      return {
        address: formatAddress(element.tags),
        brand: element.tags?.brand,
        category: formatShopCategory(element.tags?.shop),
        id: `${element.type}/${element.id}`,
        latitude: element.lat ?? element.center?.lat,
        longitude: element.lon ?? element.center?.lon,
        name,
        openingHours: element.tags?.opening_hours,
        operator: element.tags?.operator,
        phone: element.tags?.["contact:phone"] ?? element.tags?.phone,
        source: "openstreetmap",
        website: element.tags?.["contact:website"] ?? element.tags?.website
      };
    })
    .filter((store): store is StoreSummary => store !== null)
    .sort((left, right) => left.name.localeCompare(right.name));
}

function filterStores(stores: StoreSummary[], searchTerm: string | undefined) {
  const normalizedSearch = searchTerm?.trim().toLocaleLowerCase();

  if (!normalizedSearch) {
    return stores;
  }

  return stores.filter((store) =>
    [store.name, store.category, store.address].some((value) => value?.toLocaleLowerCase().includes(normalizedSearch))
  );
}

function formatShopCategory(shop: string | undefined) {
  return shop
    ?.split("_")
    .map((part) => part.charAt(0).toLocaleUpperCase() + part.slice(1))
    .join(" ");
}

function formatAddress(tags: Record<string, string | undefined> | undefined) {
  if (!tags) {
    return undefined;
  }

  return [
    [tags["addr:street"], tags["addr:housenumber"]].filter(Boolean).join(" "),
    tags["addr:city"]
  ]
    .filter(Boolean)
    .join(", ");
}

function escapeOverpassRegex(value: string) {
  return value.replace(/[\\^$.*+?()[\]{}|]/g, "\\$&").replace(/"/g, '\\"');
}

function isNetworkError(error: unknown): error is NetworkError {
  return Boolean(error && typeof error === "object" && "kind" in error && "retryable" in error);
}
