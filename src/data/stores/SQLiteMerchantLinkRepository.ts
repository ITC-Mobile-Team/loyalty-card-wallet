import { toStorageAppError } from "../../core/errors/AppError";
import {
  createMerchantKey,
  normalizeMerchantName,
  type CardMerchant,
  type ConfirmMerchantLinkInput,
  type MerchantLink,
  type MerchantLinkRepository,
  type MerchantSourceReference,
  type MerchantSuggestionDismissal,
  type OsmElementType
} from "../../domain/stores/MerchantLinks";
import type { Database, DatabaseProvider } from "../storage/Database";
import { runInTransaction } from "../storage/Database";
import { createLocalId } from "../storage/id";

type CardMerchantRow = {
  card_id: string;
  card_number: string;
  display_name: string;
  merchant_key: string;
  normalized_name: string;
  store_name: string;
};

type MissingCardMerchantRow = {
  card_number: string;
  id: string;
  store_name: string;
};

type MerchantLinkRow = {
  aliases_json: string;
  created_at: string;
  display_name: string;
  id: string;
  is_enabled: number;
  merchant_key: string;
  osm_id: string | null;
  osm_observed_name: string | null;
  osm_source: string | null;
  osm_type: string | null;
  updated_at: string;
};

type DismissalRow = {
  dismissed_at: string;
  merchant_key: string;
  osm_id: string;
  osm_observed_name: string | null;
  osm_source: string;
  osm_type: string;
};

const merchantLinkColumns = `id, merchant_key, display_name, aliases_json, osm_source, osm_type,
  osm_id, osm_observed_name, is_enabled, created_at, updated_at`;

export class SQLiteMerchantLinkRepository implements MerchantLinkRepository {
  constructor(
    private readonly databaseProvider: DatabaseProvider,
    private readonly now: () => string = () => new Date().toISOString()
  ) {}

  async ensureCardMerchants(): Promise<void> {
    await this.execute(async (database) => {
      while (true) {
        const missingCards = await database.getAllAsync<MissingCardMerchantRow>(
          `SELECT cards.id, cards.store_name, cards.card_number
           FROM cards
           LEFT JOIN card_merchant_identities ON card_merchant_identities.card_id = cards.id
           WHERE card_merchant_identities.card_id IS NULL
           ORDER BY cards.id
           LIMIT 250`
        );

        if (missingCards.length === 0) {
          return;
        }

        await runInTransaction(database, async () => {
          const timestamp = this.now();

          for (const card of missingCards) {
            await database.runAsync(
              `INSERT OR IGNORE INTO card_merchant_identities (
                card_id, merchant_key, display_name, normalized_name, created_at, updated_at
              ) VALUES (?, ?, ?, ?, ?, ?)`,
              [
                card.id,
                createMerchantKey(card.store_name),
                card.store_name,
                normalizeMerchantName(card.store_name),
                timestamp,
                timestamp
              ]
            );
          }
        });
      }
    });
  }

  async listCardMerchants(): Promise<CardMerchant[]> {
    await this.ensureCardMerchants();

    return this.execute(async (database) => {
      const rows = await database.getAllAsync<CardMerchantRow>(
        `SELECT identity.card_id, identity.merchant_key, identity.display_name, identity.normalized_name,
                cards.store_name, cards.card_number
         FROM card_merchant_identities AS identity
         INNER JOIN cards ON cards.id = identity.card_id
         WHERE cards.is_archived = 0
         ORDER BY identity.merchant_key, cards.store_name COLLATE NOCASE, cards.id`
      );
      const merchants = new Map<string, CardMerchant>();

      for (const row of rows) {
        const existing = merchants.get(row.merchant_key);

        if (existing) {
          existing.cards.push({
            cardId: row.card_id,
            cardNumberSuffix: cardNumberSuffix(row.card_number),
            storeName: row.store_name
          });
          if (!existing.aliases.includes(row.store_name) && row.store_name !== existing.displayName) {
            existing.aliases.push(row.store_name);
          }
          continue;
        }

        merchants.set(row.merchant_key, {
          aliases: row.store_name === row.display_name ? [] : [row.store_name],
          cards: [
            {
              cardId: row.card_id,
              cardNumberSuffix: cardNumberSuffix(row.card_number),
              storeName: row.store_name
            }
          ],
          displayName: row.display_name,
          merchantKey: row.merchant_key,
          normalizedName: row.normalized_name
        });
      }

      return [...merchants.values()];
    });
  }

  async listLinks(): Promise<MerchantLink[]> {
    return this.execute(async (database) => {
      const rows = await database.getAllAsync<MerchantLinkRow>(
        `SELECT ${merchantLinkColumns}
         FROM merchant_links
         ORDER BY display_name COLLATE NOCASE, updated_at DESC`
      );

      return rows.map(mapMerchantLinkRow);
    });
  }

  async listDismissals(): Promise<MerchantSuggestionDismissal[]> {
    return this.execute(async (database) => {
      const rows = await database.getAllAsync<DismissalRow>(
        `SELECT merchant_key, osm_source, osm_type, osm_id, osm_observed_name, dismissed_at
         FROM merchant_suggestion_dismissals
         ORDER BY dismissed_at DESC`
      );

      return rows.map((row) => ({
        dismissedAt: row.dismissed_at,
        merchantKey: row.merchant_key,
        sourceReference: mapSourceReference(row)
      }));
    });
  }

  async confirm(input: ConfirmMerchantLinkInput): Promise<MerchantLink> {
    return this.execute(async (database) =>
      runInTransaction(database, async () => {
        const timestamp = this.now();
        const aliases = uniqueAliases(input.aliases ?? []);
        const reference = input.sourceReference;
        const existing = reference
          ? await database.getFirstAsync<MerchantLinkRow>(
              `SELECT ${merchantLinkColumns}
               FROM merchant_links
               WHERE osm_source = ? AND osm_type = ? AND osm_id = ?
               ORDER BY updated_at DESC
               LIMIT 1`,
              [reference.source, reference.type, reference.id]
            )
          : null;
        const id = existing?.id ?? createLocalId("merchant-link");

        if (existing) {
          if (reference) {
            await deleteDuplicateSourceLinks(database, id, reference);
          }
          await database.runAsync(
            `UPDATE merchant_links
             SET merchant_key = ?, display_name = ?, aliases_json = ?, osm_observed_name = ?,
                 is_enabled = 1, updated_at = ?
             WHERE id = ?`,
            [
              input.merchantKey,
              input.displayName.trim(),
              JSON.stringify(aliases),
              reference?.observedName ?? null,
              timestamp,
              id
            ]
          );
        } else {
          await database.runAsync(
            `INSERT INTO merchant_links (
              id, merchant_key, display_name, aliases_json, osm_source, osm_type, osm_id,
              osm_observed_name, is_enabled, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
            [
              id,
              input.merchantKey,
              input.displayName.trim(),
              JSON.stringify(aliases),
              reference?.source ?? null,
              reference?.type ?? null,
              reference?.id ?? null,
              reference?.observedName ?? null,
              timestamp,
              timestamp
            ]
          );
        }

        if (reference) {
          await deleteDismissal(database, input.merchantKey, reference);
        }

        const row = await database.getFirstAsync<MerchantLinkRow>(
          `SELECT ${merchantLinkColumns} FROM merchant_links WHERE id = ?`,
          [id]
        );

        if (!row) {
          throw new Error("Confirmed merchant link could not be read.");
        }

        return mapMerchantLinkRow(row);
      })
    );
  }

  async correct(
    linkId: string,
    input: Omit<ConfirmMerchantLinkInput, "sourceReference">
  ): Promise<MerchantLink | null> {
    return this.execute(async (database) =>
      runInTransaction(database, async () => {
        const existing = await database.getFirstAsync<MerchantLinkRow>(
          `SELECT ${merchantLinkColumns} FROM merchant_links WHERE id = ?`,
          [linkId]
        );

        if (!existing) {
          return null;
        }

        const timestamp = this.now();
        const reference = mapOptionalSourceReference(existing);
        if (reference) {
          await deleteDuplicateSourceLinks(database, linkId, reference);
        }
        await database.runAsync(
          `UPDATE merchant_links
           SET merchant_key = ?, display_name = ?, aliases_json = ?, is_enabled = 1, updated_at = ?
           WHERE id = ?`,
          [
            input.merchantKey,
            input.displayName.trim(),
            JSON.stringify(uniqueAliases(input.aliases ?? [])),
            timestamp,
            linkId
          ]
        );

        if (reference) {
          await deleteDismissal(database, input.merchantKey, reference);
        }

        const updated = await database.getFirstAsync<MerchantLinkRow>(
          `SELECT ${merchantLinkColumns} FROM merchant_links WHERE id = ?`,
          [linkId]
        );

        return updated ? mapMerchantLinkRow(updated) : null;
      })
    );
  }

  async dismiss(input: { merchantKey: string; sourceReference: MerchantSourceReference }): Promise<void> {
    await this.execute(async (database) => {
      await database.runAsync(
        `INSERT OR REPLACE INTO merchant_suggestion_dismissals (
          merchant_key, osm_source, osm_type, osm_id, osm_observed_name, dismissed_at
        ) VALUES (?, ?, ?, ?, ?, ?)`,
        [
          input.merchantKey,
          input.sourceReference.source,
          input.sourceReference.type,
          input.sourceReference.id,
          input.sourceReference.observedName ?? null,
          this.now()
        ]
      );
    });
  }

  async setEnabled(linkId: string, enabled: boolean): Promise<MerchantLink | null> {
    return this.updateAndRead(
      linkId,
      `UPDATE merchant_links SET is_enabled = ?, updated_at = ? WHERE id = ?`,
      [enabled ? 1 : 0, this.now(), linkId]
    );
  }

  async repairSource(
    linkId: string,
    sourceReference: MerchantSourceReference
  ): Promise<MerchantLink | null> {
    return this.execute(async (database) =>
      runInTransaction(database, async () => {
        const existing = await database.getFirstAsync<MerchantLinkRow>(
          `SELECT ${merchantLinkColumns} FROM merchant_links WHERE id = ?`,
          [linkId]
        );

        if (!existing) {
          return null;
        }

        await database.runAsync(
          `UPDATE merchant_links
           SET osm_source = ?, osm_type = ?, osm_id = ?, osm_observed_name = ?, updated_at = ?
           WHERE id = ?`,
          [
            sourceReference.source,
            sourceReference.type,
            sourceReference.id,
            sourceReference.observedName ?? null,
            this.now(),
            linkId
          ]
        );
        await deleteDismissal(database, existing.merchant_key, sourceReference);

        const updated = await database.getFirstAsync<MerchantLinkRow>(
          `SELECT ${merchantLinkColumns} FROM merchant_links WHERE id = ?`,
          [linkId]
        );

        return updated ? mapMerchantLinkRow(updated) : null;
      })
    );
  }

  async remove(linkId: string): Promise<void> {
    await this.execute(async (database) => {
      await database.runAsync("DELETE FROM merchant_links WHERE id = ?", [linkId]);
    });
  }

  private async updateAndRead(
    linkId: string,
    sql: string,
    params: readonly (string | number | null | Uint8Array)[]
  ): Promise<MerchantLink | null> {
    return this.execute(async (database) => {
      const result = await database.runAsync(sql, params);

      if (result.changes === 0) {
        return null;
      }

      const row = await database.getFirstAsync<MerchantLinkRow>(
        `SELECT ${merchantLinkColumns} FROM merchant_links WHERE id = ?`,
        [linkId]
      );

      return row ? mapMerchantLinkRow(row) : null;
    });
  }

  private async execute<T>(operation: (database: Database) => Promise<T>): Promise<T> {
    try {
      return await operation(await this.databaseProvider());
    } catch (error) {
      throw toStorageAppError(error, "Merchant-link storage operation failed.");
    }
  }
}

export async function upsertCardMerchantIdentity(
  database: Database,
  input: {
    cardId: string;
    displayName: string;
    now: string;
    preserveExistingKey: boolean;
  }
): Promise<void> {
  const existing = input.preserveExistingKey
    ? await database.getFirstAsync<{ merchant_key: string }>(
        "SELECT merchant_key FROM card_merchant_identities WHERE card_id = ?",
        [input.cardId]
      )
    : null;
  const merchantKey = existing?.merchant_key ?? createMerchantKey(input.displayName);

  await database.runAsync(
    `INSERT INTO card_merchant_identities (
      card_id, merchant_key, display_name, normalized_name, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(card_id) DO UPDATE SET
      display_name = excluded.display_name,
      normalized_name = excluded.normalized_name,
      updated_at = excluded.updated_at`,
    [
      input.cardId,
      merchantKey,
      input.displayName,
      normalizeMerchantName(input.displayName),
      input.now,
      input.now
    ]
  );
}

function mapMerchantLinkRow(row: MerchantLinkRow): MerchantLink {
  return {
    aliases: parseAliases(row.aliases_json),
    createdAt: row.created_at,
    displayName: row.display_name,
    enabled: row.is_enabled === 1,
    id: row.id,
    merchantKey: row.merchant_key,
    sourceReference: mapOptionalSourceReference(row),
    updatedAt: row.updated_at
  };
}

function mapOptionalSourceReference(row: {
  osm_id: string | null;
  osm_observed_name: string | null;
  osm_source: string | null;
  osm_type: string | null;
}): MerchantSourceReference | undefined {
  return row.osm_source === "openstreetmap" && isOsmElementType(row.osm_type) && row.osm_id
    ? {
        id: row.osm_id,
        observedName: row.osm_observed_name ?? undefined,
        source: "openstreetmap",
        type: row.osm_type
      }
    : undefined;
}

function mapSourceReference(row: DismissalRow): MerchantSourceReference {
  if (row.osm_source !== "openstreetmap" || !isOsmElementType(row.osm_type)) {
    throw new Error("Unsupported stored merchant source reference.");
  }

  return {
    id: row.osm_id,
    observedName: row.osm_observed_name ?? undefined,
    source: "openstreetmap",
    type: row.osm_type
  };
}

function isOsmElementType(value: string | null): value is OsmElementType {
  return value === "node" || value === "way" || value === "relation";
}

function parseAliases(value: string): string[] {
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((alias): alias is string => typeof alias === "string") : [];
  } catch {
    return [];
  }
}

function uniqueAliases(aliases: readonly string[]): string[] {
  return [...new Set(aliases.map((alias) => alias.trim()).filter(Boolean))];
}

function cardNumberSuffix(cardNumber: string): string {
  const compact = cardNumber.replace(/\s+/g, "");
  return compact.slice(-4);
}

async function deleteDismissal(
  database: Database,
  merchantKey: string,
  reference: MerchantSourceReference
): Promise<void> {
  await database.runAsync(
    `DELETE FROM merchant_suggestion_dismissals
     WHERE merchant_key = ? AND osm_source = ? AND osm_type = ? AND osm_id = ?`,
    [merchantKey, reference.source, reference.type, reference.id]
  );
}

async function deleteDuplicateSourceLinks(
  database: Database,
  retainedLinkId: string,
  reference: MerchantSourceReference
): Promise<void> {
  await database.runAsync(
    `DELETE FROM merchant_links
     WHERE id <> ? AND osm_source = ? AND osm_type = ? AND osm_id = ?`,
    [retainedLinkId, reference.source, reference.type, reference.id]
  );
}
