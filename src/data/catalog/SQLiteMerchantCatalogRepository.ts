import { toStorageAppError } from "@/core/errors/AppError";
import type {
  MerchantCatalogEntry,
  MerchantCatalogOverride,
  MerchantCatalogRepository,
  MerchantCatalogSearchResult
} from "@/domain/catalog/MerchantCatalog";
import type { DatabaseProvider } from "@/data/storage/Database";

import { BundledMerchantCatalogRepository } from "./BundledMerchantCatalogRepository";
import { ukraineMerchantCatalog } from "./ukraineMerchantCatalog";

type OverrideRow = {
  aliases_json: string;
  artwork_image_id: string | null;
  merchant_id: string;
  updated_at: string;
};

export class SQLiteMerchantCatalogRepository implements MerchantCatalogRepository {
  constructor(
    private readonly databaseProvider: DatabaseProvider,
    private readonly bundled = new BundledMerchantCatalogRepository()
  ) {}

  async getById(id: string): Promise<MerchantCatalogEntry | null> {
    const entry = await this.bundled.getById(id);
    if (!entry) return null;
    const override = await this.getOverride(id);
    return override ? { ...entry, aliases: [...entry.aliases, ...override.aliases] } : entry;
  }

  async search(query: string, limit: number = 20): Promise<MerchantCatalogSearchResult[]> {
    const normalized = normalize(query);
    const overrides = await this.listOverrides();
    const scored: (MerchantCatalogSearchResult & { score: number })[] = [];

    for (const entry of ukraineMerchantCatalog) {
      const override = overrides.get(entry.id);
      const aliases = [...entry.aliases, ...(override?.aliases ?? [])];
      const matchedAlias = aliases.find((alias) => normalize(alias).includes(normalized));
      const nameMatches = normalize(entry.name).includes(normalized);

      if (normalized && !matchedAlias && !nameMatches) continue;
      scored.push({
        ...entry,
        aliases,
        matchedAlias: matchedAlias && matchedAlias !== entry.name ? matchedAlias : undefined,
        score: normalize(entry.name).startsWith(normalized) ? 0 : matchedAlias ? 1 : 2
      });
    }

    return scored
      .sort((left, right) => left.score - right.score || left.name.localeCompare(right.name, "uk"))
      .slice(0, Math.max(1, limit))
      .map(({ score: _score, ...entry }) => entry);
  }

  version(): number {
    return this.bundled.version();
  }

  async saveOverride(
    input: Omit<MerchantCatalogOverride, "updatedAt">
  ): Promise<MerchantCatalogOverride> {
    try {
      const updatedAt = new Date().toISOString();
      const database = await this.databaseProvider();
      await database.runAsync(
        `INSERT INTO merchant_catalog_overrides (merchant_id, aliases_json, artwork_image_id, updated_at)
         VALUES (?, ?, ?, ?)
         ON CONFLICT(merchant_id) DO UPDATE SET
           aliases_json = excluded.aliases_json,
           artwork_image_id = excluded.artwork_image_id,
           updated_at = excluded.updated_at`,
        [input.merchantId, JSON.stringify(input.aliases), input.artworkImageId ?? null, updatedAt]
      );
      return { ...input, updatedAt };
    } catch (error) {
      throw toStorageAppError(error, "The merchant customization could not be saved.");
    }
  }

  private async getOverride(merchantId: string): Promise<MerchantCatalogOverride | null> {
    const overrides = await this.listOverrides();
    return overrides.get(merchantId) ?? null;
  }

  private async listOverrides(): Promise<Map<string, MerchantCatalogOverride>> {
    try {
      const rows = await (await this.databaseProvider()).getAllAsync<OverrideRow>(
        "SELECT merchant_id, aliases_json, artwork_image_id, updated_at FROM merchant_catalog_overrides"
      );
      return new Map(
        rows.map((row) => [
          row.merchant_id,
          {
            aliases: parseAliases(row.aliases_json),
            artworkImageId: row.artwork_image_id ?? undefined,
            merchantId: row.merchant_id,
            updatedAt: row.updated_at
          }
        ])
      );
    } catch (error) {
      throw toStorageAppError(error, "Merchant customizations could not be loaded.");
    }
  }
}

function parseAliases(value: string): string[] {
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

function normalize(value: string): string {
  return value.trim().toLocaleLowerCase("uk-UA");
}
