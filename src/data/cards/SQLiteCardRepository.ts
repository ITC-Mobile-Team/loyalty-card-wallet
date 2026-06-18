import { isBarcodeFormat, type LoyaltyCard } from "../../domain/cards/Card";
import type { CardRepository, CreateCardInput, UpdateCardInput } from "../../domain/cards/CardRepository";
import { toStorageAppError } from "../../core/errors/AppError";
import type { Database, DatabaseProvider, SqlBindable } from "../storage/Database";
import { createLocalId } from "../storage/id";

type CardRow = {
  id: string;
  store_name: string;
  card_number: string;
  barcode_format: string;
  primary_image_id: string | null;
  thumbnail_image_id: string | null;
  background_color: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

function mapCardRow(row: CardRow): LoyaltyCard {
  if (!isBarcodeFormat(row.barcode_format)) {
    throw { kind: "storage", message: `Unsupported stored barcode format: ${row.barcode_format}.` };
  }

  return {
    id: row.id,
    storeName: row.store_name,
    cardNumber: row.card_number,
    barcodeFormat: row.barcode_format,
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

export class SQLiteCardRepository implements CardRepository {
  constructor(private readonly databaseProvider: DatabaseProvider) {}

  async list(): Promise<LoyaltyCard[]> {
    return this.execute(async (database) => {
      const rows = await database.getAllAsync<CardRow>(
        `SELECT id, store_name, card_number, barcode_format, primary_image_id, thumbnail_image_id,
          background_color, notes, created_at, updated_at
        FROM cards
        ORDER BY store_name COLLATE NOCASE ASC, updated_at DESC`
      );

      return rows.map(mapCardRow);
    });
  }

  async getById(id: string): Promise<LoyaltyCard | null> {
    return this.execute(async (database) => {
      const row = await database.getFirstAsync<CardRow>(
        `SELECT id, store_name, card_number, barcode_format, primary_image_id, thumbnail_image_id,
          background_color, notes, created_at, updated_at
        FROM cards
        WHERE id = ?`,
        [id]
      );

      return row ? mapCardRow(row) : null;
    });
  }

  async create(input: CreateCardInput): Promise<LoyaltyCard> {
    validateCardInput(input);

    return this.execute(async (database) => {
      const now = new Date().toISOString();
      const card: LoyaltyCard = {
        id: createLocalId("card"),
        createdAt: now,
        updatedAt: now,
        ...input,
        storeName: input.storeName.trim(),
        cardNumber: input.cardNumber.trim()
      };

      await database.runAsync(
        `INSERT INTO cards (
          id, store_name, card_number, barcode_format, primary_image_id, thumbnail_image_id,
          background_color, notes, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          card.id,
          card.storeName,
          card.cardNumber,
          card.barcodeFormat,
          card.primaryImageId ?? null,
          card.thumbnailImageId ?? null,
          card.backgroundColor ?? null,
          card.notes ?? null,
          card.createdAt,
          card.updatedAt
        ]
      );

      return card;
    });
  }

  async update(id: string, input: UpdateCardInput): Promise<LoyaltyCard | null> {
    validateCardInput(input);

    return this.execute(async (database) => {
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

      addAssignment("updated_at", new Date().toISOString());
      params.push(id);

      const result = await database.runAsync(`UPDATE cards SET ${assignments.join(", ")} WHERE id = ?`, params);

      if (result.changes === 0) {
        return null;
      }

      return this.getById(id);
    });
  }

  async delete(id: string): Promise<void> {
    await this.execute(async (database) => {
      await database.runAsync("DELETE FROM cards WHERE id = ?", [id]);
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
