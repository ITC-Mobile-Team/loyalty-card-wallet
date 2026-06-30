import { toStorageAppError } from "../../core/errors/AppError";
import { isBarcodeFormat, type LoyaltyCard } from "../../domain/cards/Card";
import type { CardRepository, CreateCardInput, UpdateCardInput } from "../../domain/cards/CardRepository";
import {
  createCardDuplicateKey,
  type CardDuplicateKey,
  type CardQuery,
  type CardQueryPage,
  type CardQueryRepository
} from "../../domain/cards/CardQueryRepository";
import type { Database, DatabaseProvider, SqlBindable } from "../storage/Database";
import { runInTransaction } from "../storage/Database";
import { createLocalId } from "../storage/id";
import { upsertCardMerchantIdentity } from "../stores/SQLiteMerchantLinkRepository";

type CardRow = {
  id: string;
  store_name: string;
  card_number: string;
  barcode_format: string;
  primary_image_id: string | null;
  thumbnail_image_id: string | null;
  background_color: string | null;
  notes: string | null;
  is_archived: number;
  is_favorite: number;
  last_used_at: string | null;
  created_at: string;
  updated_at: string;
};

const cardColumns = `id, store_name, card_number, barcode_format, primary_image_id, thumbnail_image_id,
  background_color, notes, is_archived, is_favorite, last_used_at, created_at, updated_at`;

function mapCardRow(row: CardRow): LoyaltyCard {
  if (!isBarcodeFormat(row.barcode_format)) {
    throw { kind: "storage", message: `Unsupported stored barcode format: ${row.barcode_format}.` };
  }

  return {
    id: row.id,
    storeName: row.store_name,
    cardNumber: row.card_number,
    barcodeFormat: row.barcode_format,
    isArchived: row.is_archived === 1,
    isFavorite: row.is_favorite === 1,
    lastUsedAt: row.last_used_at ?? undefined,
    primaryImageId: row.primary_image_id ?? undefined,
    thumbnailImageId: row.thumbnail_image_id ?? undefined,
    backgroundColor: row.background_color ?? undefined,
    notes: row.notes ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function validateCardInput(input: CreateCardInput | UpdateCardInput): void {
  if ("storeName" in input && input.storeName !== undefined && input.storeName.trim().length === 0) {
    throw { kind: "validation", field: "storeName", message: "Store name is required." };
  }

  if ("cardNumber" in input && input.cardNumber !== undefined && input.cardNumber.trim().length === 0) {
    throw { kind: "validation", field: "cardNumber", message: "Card number is required." };
  }

  if ("barcodeFormat" in input && input.barcodeFormat !== undefined && !isBarcodeFormat(input.barcodeFormat)) {
    throw { kind: "validation", field: "barcodeFormat", message: "Barcode format is not supported." };
  }
}

export class SQLiteCardRepository implements CardRepository, CardQueryRepository {
  constructor(private readonly databaseProvider: DatabaseProvider) {}

  async list(): Promise<LoyaltyCard[]> {
    return this.execute(async (database) => {
      const rows = await database.getAllAsync<CardRow>(
        `SELECT ${cardColumns}
        FROM cards
        ORDER BY store_name COLLATE NOCASE ASC, updated_at DESC`
      );

      return rows.map(mapCardRow);
    });
  }

  async getById(id: string): Promise<LoyaltyCard | null> {
    return this.execute(async (database) => {
      const row = await database.getFirstAsync<CardRow>(
        `SELECT ${cardColumns}
        FROM cards
        WHERE id = ?`,
        [id]
      );

      return row ? mapCardRow(row) : null;
    });
  }

  async create(input: CreateCardInput): Promise<LoyaltyCard> {
    validateCardInput(input);

    return this.execute(async (database) => runInTransaction(database, async () => {
      const now = new Date().toISOString();
      const card: LoyaltyCard = {
        id: createLocalId("card"),
        createdAt: now,
        updatedAt: now,
        ...input,
        isArchived: input.isArchived ?? false,
        isFavorite: input.isFavorite ?? false,
        storeName: input.storeName.trim(),
        cardNumber: input.cardNumber.trim()
      };

      await database.runAsync(
        `INSERT INTO cards (
          id, store_name, card_number, barcode_format, primary_image_id, thumbnail_image_id,
          background_color, notes, is_archived, is_favorite, last_used_at, normalized_key,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          card.id,
          card.storeName,
          card.cardNumber,
          card.barcodeFormat,
          card.primaryImageId ?? null,
          card.thumbnailImageId ?? null,
          card.backgroundColor ?? null,
          card.notes ?? null,
          card.isArchived ? 1 : 0,
          card.isFavorite ? 1 : 0,
          card.lastUsedAt ?? null,
          createCardDuplicateKey(card),
          card.createdAt,
          card.updatedAt
        ]
      );
      await upsertCardMerchantIdentity(database, {
        cardId: card.id,
        displayName: card.storeName,
        now,
        preserveExistingKey: false
      });

      return card;
    }));
  }

  async update(id: string, input: UpdateCardInput): Promise<LoyaltyCard | null> {
    validateCardInput(input);

    return this.execute(async (database) => runInTransaction(database, async () => {
      const existing = await this.getById(id);

      if (!existing) {
        return null;
      }

      const assignments: string[] = [];
      const params: SqlBindable[] = [];
      const addAssignment = (column: string, value: SqlBindable) => {
        assignments.push(`${column} = ?`);
        params.push(value);
      };

      if (input.storeName !== undefined) addAssignment("store_name", input.storeName.trim());
      if (input.cardNumber !== undefined) addAssignment("card_number", input.cardNumber.trim());
      if (input.barcodeFormat !== undefined) addAssignment("barcode_format", input.barcodeFormat);
      if (input.primaryImageId !== undefined) addAssignment("primary_image_id", input.primaryImageId);
      if (input.thumbnailImageId !== undefined) addAssignment("thumbnail_image_id", input.thumbnailImageId);
      if (input.backgroundColor !== undefined) addAssignment("background_color", input.backgroundColor);
      if (input.notes !== undefined) addAssignment("notes", input.notes);
      if (input.isArchived !== undefined) addAssignment("is_archived", input.isArchived ? 1 : 0);
      if (input.isFavorite !== undefined) addAssignment("is_favorite", input.isFavorite ? 1 : 0);
      if (input.lastUsedAt !== undefined) addAssignment("last_used_at", input.lastUsedAt);

      addAssignment(
        "normalized_key",
        createCardDuplicateKey({
          barcodeFormat: input.barcodeFormat ?? existing.barcodeFormat,
          cardNumber: input.cardNumber ?? existing.cardNumber,
          storeName: input.storeName ?? existing.storeName
        })
      );
      addAssignment("updated_at", new Date().toISOString());
      params.push(id);

      const result = await database.runAsync(`UPDATE cards SET ${assignments.join(", ")} WHERE id = ?`, params);

      if (result.changes === 0) {
        return null;
      }

      if (input.storeName !== undefined) {
        await upsertCardMerchantIdentity(database, {
          cardId: id,
          displayName: input.storeName.trim(),
          now: new Date().toISOString(),
          preserveExistingKey: true
        });
      }

      return this.getById(id);
    }));
  }

  async delete(id: string): Promise<void> {
    await this.execute(async (database) => {
      await database.runAsync("DELETE FROM cards WHERE id = ?", [id]);
    });
  }

  async query(query: CardQuery): Promise<CardQueryPage> {
    return this.execute(async (database) => {
      const where: string[] = ["is_archived = ?"];
      const params: SqlBindable[] = [query.archived ? 1 : 0];
      const search = query.search?.trim();

      if (query.favoriteOnly) {
        where.push("is_favorite = 1");
      }

      if (search) {
        where.push("(store_name LIKE ? COLLATE NOCASE OR replace(replace(card_number, ' ', ''), '-', '') LIKE ?)");
        params.push(`%${search}%`, `%${search.replace(/[\s-]+/g, "")}%`);
      }

      const whereSql = `WHERE ${where.join(" AND ")}`;
      const countRow = await database.getFirstAsync<{ count: number }>(
        `SELECT COUNT(*) AS count FROM cards ${whereSql}`,
        params
      );
      const limit = Math.max(1, Math.min(query.limit ?? 100, 200));
      const offset = Math.max(0, query.offset ?? 0);
      const orderSql =
        query.sort === "recent"
          ? "ORDER BY is_favorite DESC, COALESCE(last_used_at, updated_at) DESC, store_name COLLATE NOCASE ASC"
          : "ORDER BY is_favorite DESC, store_name COLLATE NOCASE ASC, updated_at DESC";
      const rows = await database.getAllAsync<CardRow>(
        `SELECT ${cardColumns} FROM cards ${whereSql} ${orderSql} LIMIT ? OFFSET ?`,
        [...params, limit, offset]
      );
      const total = countRow?.count ?? 0;

      return {
        cards: rows.map(mapCardRow),
        hasMore: offset + rows.length < total,
        total
      };
    });
  }

  async findDuplicateIds(keys: readonly CardDuplicateKey[]): Promise<Map<string, string>> {
    if (keys.length === 0) {
      return new Map();
    }

    return this.execute(async (database) => {
      const result = new Map<string, string>();
      const normalizedKeys = [...new Set(keys.map(createCardDuplicateKey))];

      for (let offset = 0; offset < normalizedKeys.length; offset += 100) {
        const chunk = normalizedKeys.slice(offset, offset + 100);
        const placeholders = chunk.map(() => "?").join(", ");
        const rows = await database.getAllAsync<{ id: string; normalized_key: string }>(
          `SELECT id, normalized_key FROM cards WHERE normalized_key IN (${placeholders})`,
          chunk
        );

        rows.forEach((row) => result.set(row.normalized_key, row.id));
      }

      if (result.size < normalizedKeys.length) {
        const legacyRows = await database.getAllAsync<{
          barcode_format: string;
          card_number: string;
          id: string;
          store_name: string;
        }>("SELECT id, store_name, card_number, barcode_format FROM cards");

        for (const row of legacyRows) {
          if (!isBarcodeFormat(row.barcode_format)) continue;
          const key = createCardDuplicateKey({
            barcodeFormat: row.barcode_format,
            cardNumber: row.card_number,
            storeName: row.store_name
          });

          if (normalizedKeys.includes(key) && !result.has(key)) {
            result.set(key, row.id);
            await database.runAsync("UPDATE cards SET normalized_key = ? WHERE id = ?", [key, row.id]);
          }
        }
      }

      return result;
    });
  }

  private async execute<T>(operation: (database: Database) => Promise<T>): Promise<T> {
    try {
      const database = await this.databaseProvider();
      return await operation(database);
    } catch (error) {
      throw toStorageAppError(error);
    }
  }
}
