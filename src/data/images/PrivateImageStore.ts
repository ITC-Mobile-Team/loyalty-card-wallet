import type {
  ImageStore,
  SaveImageInput,
  StoredImage,
  StoredImagePayload
} from "../../domain/images/ImageStore";
import { toStorageAppError } from "../../core/errors/AppError";
import type { Database, DatabaseProvider } from "../storage/Database";
import { runInTransaction } from "../storage/Database";
import { createLocalId } from "../storage/id";
import { SUPPORTED_IMAGE_MIME_TYPES, SUPPORTED_IMAGE_ROLES } from "../storage/schema";

type ImageRow = {
  id: string;
  card_id: string;
  role: string;
  mime_type: string;
  width: number;
  height: number;
  byte_length: number;
  data_ref: string;
  created_at: string;
};

type ImagePayloadRow = ImageRow & {
  bytes: Uint8Array;
};

function mapImageRow(row: ImageRow): StoredImage {
  if (!SUPPORTED_IMAGE_ROLES.includes(row.role as StoredImage["role"])) {
    throw { kind: "storage", message: `Unsupported stored image role: ${row.role}.` };
  }

  if (!SUPPORTED_IMAGE_MIME_TYPES.includes(row.mime_type as StoredImage["mimeType"])) {
    throw { kind: "storage", message: `Unsupported stored image MIME type: ${row.mime_type}.` };
  }

  return {
    id: row.id,
    cardId: row.card_id,
    role: row.role as StoredImage["role"],
    mimeType: row.mime_type as StoredImage["mimeType"],
    width: row.width,
    height: row.height,
    byteLength: row.byte_length,
    dataRef: row.data_ref,
    createdAt: row.created_at
  };
}

function validateImageInput(input: SaveImageInput): void {
  if (!SUPPORTED_IMAGE_ROLES.includes(input.role)) {
    throw { kind: "validation", field: "role", message: "Image role is not supported." };
  }

  if (!SUPPORTED_IMAGE_MIME_TYPES.includes(input.mimeType)) {
    throw { kind: "validation", field: "mimeType", message: "Image MIME type is not supported." };
  }

  if (!input.cardId.trim()) {
    throw { kind: "validation", field: "cardId", message: "Card id is required." };
  }

  if (input.width <= 0 || input.height <= 0) {
    throw { kind: "validation", message: "Image dimensions must be positive." };
  }

  if (input.data.byteLength === 0) {
    throw { kind: "validation", field: "data", message: "Image data is required." };
  }
}

export class PrivateImageStore implements ImageStore {
  constructor(private readonly databaseProvider: DatabaseProvider) {}

  async saveImage(input: SaveImageInput): Promise<StoredImage> {
    validateImageInput(input);

    return this.execute(async (database) => {
      const now = new Date().toISOString();
      const id = createLocalId("image");
      const dataRef = `private-image:${id}`;
      const metadata: StoredImage = {
        id,
        cardId: input.cardId,
        role: input.role,
        mimeType: input.mimeType,
        width: input.width,
        height: input.height,
        byteLength: input.data.byteLength,
        dataRef,
        createdAt: now
      };

      await runInTransaction(database, async () => {
        await database.runAsync(
          "INSERT INTO image_payloads (data_ref, bytes, byte_length, created_at) VALUES (?, ?, ?, ?)",
          [metadata.dataRef, input.data, metadata.byteLength, metadata.createdAt]
        );
        await database.runAsync(
          `INSERT INTO card_images (
            id, card_id, role, mime_type, width, height, byte_length, data_ref, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            metadata.id,
            metadata.cardId,
            metadata.role,
            metadata.mimeType,
            metadata.width,
            metadata.height,
            metadata.byteLength,
            metadata.dataRef,
            metadata.createdAt
          ]
        );
      });

      return metadata;
    });
  }

  async getImage(id: string): Promise<StoredImagePayload | null> {
    return this.execute(async (database) => {
      const row = await database.getFirstAsync<ImagePayloadRow>(
        `SELECT card_images.id, card_images.card_id, card_images.role, card_images.mime_type,
          card_images.width, card_images.height, card_images.byte_length, card_images.data_ref,
          card_images.created_at, image_payloads.bytes
        FROM card_images
        INNER JOIN image_payloads ON image_payloads.data_ref = card_images.data_ref
        WHERE card_images.id = ?`,
        [id]
      );

      return row ? { metadata: mapImageRow(row), data: row.bytes } : null;
    });
  }

  async listForCard(cardId: string): Promise<StoredImage[]> {
    return this.execute(async (database) => {
      const rows = await database.getAllAsync<ImageRow>(
        `SELECT id, card_id, role, mime_type, width, height, byte_length, data_ref, created_at
        FROM card_images
        WHERE card_id = ?
        ORDER BY role DESC, created_at ASC`,
        [cardId]
      );

      return rows.map(mapImageRow);
    });
  }

  async deleteImage(id: string): Promise<void> {
    await this.execute(async (database) => {
      const row = await database.getFirstAsync<{ data_ref: string }>(
        "SELECT data_ref FROM card_images WHERE id = ?",
        [id]
      );

      if (!row) {
        return;
      }

      await runInTransaction(database, async () => {
        await database.runAsync("DELETE FROM card_images WHERE id = ?", [id]);
        await database.runAsync("DELETE FROM image_payloads WHERE data_ref = ?", [row.data_ref]);
      });
    });
  }

  async deleteUnreferencedPayloads(): Promise<number> {
    return this.execute(async (database) => {
      const result = await database.runAsync(
        `DELETE FROM image_payloads
        WHERE data_ref NOT IN (SELECT data_ref FROM card_images)`
      );

      return result.changes;
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
