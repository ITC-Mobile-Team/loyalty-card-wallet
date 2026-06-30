import type {
  MerchantCatalogEntry,
  MerchantCatalogOverride,
  MerchantCatalogRepository,
  MerchantCatalogSearchResult
} from "@/domain/catalog/MerchantCatalog";

import {
  UKRAINE_MERCHANT_CATALOG_VERSION,
  ukraineMerchantCatalog
} from "./ukraineMerchantCatalog";

export class BundledMerchantCatalogRepository implements MerchantCatalogRepository {
  private readonly overrides = new Map<string, MerchantCatalogOverride>();
  constructor(private readonly entries: readonly MerchantCatalogEntry[] = ukraineMerchantCatalog) {}

  async getById(id: string): Promise<MerchantCatalogEntry | null> {
    const entry = this.entries.find((candidate) => candidate.id === id);
    const override = this.overrides.get(id);
    return entry
      ? { ...entry, aliases: [...entry.aliases, ...(override?.aliases ?? [])] }
      : null;
  }

  async search(query: string, limit: number = 20): Promise<MerchantCatalogSearchResult[]> {
    const normalized = normalize(query);
    const scored: (MerchantCatalogSearchResult & { score: number })[] = [];

    for (const originalEntry of this.entries) {
      const override = this.overrides.get(originalEntry.id);
      const entry = {
        ...originalEntry,
        aliases: [...originalEntry.aliases, ...(override?.aliases ?? [])]
      };
      const matchedAlias = entry.aliases.find((alias) => normalize(alias).includes(normalized));
      const nameMatches = normalize(entry.name).includes(normalized);

      if (normalized && !matchedAlias && !nameMatches) {
        continue;
      }

      scored.push({
        ...entry,
        matchedAlias: matchedAlias && matchedAlias !== entry.name ? matchedAlias : undefined,
        score: normalize(entry.name).startsWith(normalized) ? 0 : matchedAlias ? 1 : 2
      });
    }

    const matches = scored
      .sort((left, right) => left.score - right.score || left.name.localeCompare(right.name, "uk"))
      .slice(0, Math.max(1, limit));

    return matches.map(({ score: _score, ...entry }) => entry);
  }

  version(): number {
    return UKRAINE_MERCHANT_CATALOG_VERSION;
  }

  async saveOverride(
    input: Omit<MerchantCatalogOverride, "updatedAt">
  ): Promise<MerchantCatalogOverride> {
    const override = { ...input, updatedAt: new Date().toISOString() };
    this.overrides.set(input.merchantId, override);
    return override;
  }
}

function normalize(value: string): string {
  return value.trim().toLocaleLowerCase("uk-UA");
}
