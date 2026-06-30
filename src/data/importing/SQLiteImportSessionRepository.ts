import { toStorageAppError } from "@/core/errors/AppError";
import { isBarcodeFormat } from "@/domain/cards/Card";
import type {
  CreateImportDraftInput,
  ImportDraft,
  ImportDraftStatus,
  ImportSession,
  ImportSessionRepository,
  ImportSessionStatus,
  UpdateImportDraftInput
} from "@/domain/importing/ImportSession";
import type { Database, DatabaseProvider, SqlBindable } from "@/data/storage/Database";
import { createLocalId } from "@/data/storage/id";

type SessionRow = {
  created_at: string;
  id: string;
  status: ImportSessionStatus;
  total_sources: number;
  updated_at: string;
};

type DraftRow = {
  barcode_format: string | null;
  card_number: string | null;
  created_at: string;
  duplicate_card_id: string | null;
  error_code: string | null;
  error_message: string | null;
  id: string;
  imported_card_id: string | null;
  session_id: string;
  source_index: number;
  source_name: string;
  status: ImportDraftStatus;
  store_name: string | null;
  updated_at: string;
};

function mapSession(row: SessionRow): ImportSession {
  return {
    createdAt: row.created_at,
    id: row.id,
    status: row.status,
    totalSources: row.total_sources,
    updatedAt: row.updated_at
  };
}

function mapDraft(row: DraftRow): ImportDraft {
  const barcodeFormat =
    row.barcode_format && isBarcodeFormat(row.barcode_format) ? row.barcode_format : undefined;

  return {
    barcodeFormat,
    cardNumber: row.card_number ?? undefined,
    createdAt: row.created_at,
    duplicateCardId: row.duplicate_card_id ?? undefined,
    errorCode: row.error_code ?? undefined,
    errorMessage: row.error_message ?? undefined,
    id: row.id,
    importedCardId: row.imported_card_id ?? undefined,
    sessionId: row.session_id,
    sourceIndex: row.source_index,
    sourceName: row.source_name,
    status: row.status,
    storeName: row.store_name ?? undefined,
    updatedAt: row.updated_at
  };
}

export class SQLiteImportSessionRepository implements ImportSessionRepository {
  constructor(private readonly databaseProvider: DatabaseProvider) {}

  async create(totalSources: number): Promise<ImportSession> {
    return this.execute(async (database) => {
      const now = new Date().toISOString();
      const session: ImportSession = {
        createdAt: now,
        id: createLocalId("import-session"),
        status: "active",
        totalSources,
        updatedAt: now
      };
      await database.runAsync(
        `INSERT INTO import_sessions (id, status, total_sources, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?)`,
        [session.id, session.status, session.totalSources, now, now]
      );
      return session;
    });
  }

  async addDraft(sessionId: string, input: CreateImportDraftInput): Promise<ImportDraft> {
    return this.execute(async (database) => {
      const now = new Date().toISOString();
      const draft: ImportDraft = {
        ...input,
        createdAt: now,
        id: createLocalId("import-draft"),
        sessionId,
        updatedAt: now
      };
      await database.runAsync(
        `INSERT INTO import_drafts (
          id, session_id, source_index, source_name, status, store_name, card_number,
          barcode_format, duplicate_card_id, error_code, error_message, imported_card_id,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          draft.id,
          sessionId,
          draft.sourceIndex,
          draft.sourceName,
          draft.status,
          draft.storeName ?? null,
          draft.cardNumber ?? null,
          draft.barcodeFormat ?? null,
          draft.duplicateCardId ?? null,
          draft.errorCode ?? null,
          draft.errorMessage ?? null,
          draft.importedCardId ?? null,
          now,
          now
        ]
      );
      await database.runAsync("UPDATE import_sessions SET updated_at = ? WHERE id = ?", [now, sessionId]);
      return draft;
    });
  }

  async getActive(): Promise<ImportSession | null> {
    return this.execute(async (database) => {
      const row = await database.getFirstAsync<SessionRow>(
        `SELECT id, status, total_sources, created_at, updated_at
         FROM import_sessions WHERE status = 'active' ORDER BY updated_at DESC LIMIT 1`
      );
      return row ? mapSession(row) : null;
    });
  }

  async getById(id: string): Promise<ImportSession | null> {
    return this.execute(async (database) => {
      const row = await database.getFirstAsync<SessionRow>(
        "SELECT id, status, total_sources, created_at, updated_at FROM import_sessions WHERE id = ?",
        [id]
      );
      return row ? mapSession(row) : null;
    });
  }

  async listDrafts(sessionId: string): Promise<ImportDraft[]> {
    return this.execute(async (database) => {
      const rows = await database.getAllAsync<DraftRow>(
        `SELECT id, session_id, source_index, source_name, status, store_name, card_number,
          barcode_format, duplicate_card_id, error_code, error_message, imported_card_id,
          created_at, updated_at
         FROM import_drafts WHERE session_id = ? ORDER BY source_index ASC`,
        [sessionId]
      );
      return rows.map(mapDraft);
    });
  }

  async setStatus(id: string, status: ImportSessionStatus): Promise<void> {
    await this.execute(async (database) => {
      await database.runAsync("UPDATE import_sessions SET status = ?, updated_at = ? WHERE id = ?", [
        status,
        new Date().toISOString(),
        id
      ]);
    });
  }

  async updateDraft(id: string, input: UpdateImportDraftInput): Promise<ImportDraft | null> {
    return this.execute(async (database) => {
      const assignments: string[] = [];
      const params: SqlBindable[] = [];
      const add = (column: string, value: SqlBindable) => {
        assignments.push(`${column} = ?`);
        params.push(value);
      };

      if (input.status !== undefined) add("status", input.status);
      if (input.storeName !== undefined) add("store_name", input.storeName);
      if (input.cardNumber !== undefined) add("card_number", input.cardNumber);
      if (input.barcodeFormat !== undefined) add("barcode_format", input.barcodeFormat);
      if (input.duplicateCardId !== undefined) add("duplicate_card_id", input.duplicateCardId);
      if (input.errorCode !== undefined) add("error_code", input.errorCode);
      if (input.errorMessage !== undefined) add("error_message", input.errorMessage);
      if (input.importedCardId !== undefined) add("imported_card_id", input.importedCardId);

      add("updated_at", new Date().toISOString());
      params.push(id);
      const updateResult = await database.runAsync(
        `UPDATE import_drafts SET ${assignments.join(", ")} WHERE id = ?`,
        params
      );

      if (updateResult.changes === 0) {
        return null;
      }

      const row = await database.getFirstAsync<DraftRow>(
        `SELECT id, session_id, source_index, source_name, status, store_name, card_number,
          barcode_format, duplicate_card_id, error_code, error_message, imported_card_id,
          created_at, updated_at
         FROM import_drafts WHERE id = ?`,
        [id]
      );
      return row ? mapDraft(row) : null;
    });
  }

  private async execute<T>(operation: (database: Database) => Promise<T>): Promise<T> {
    try {
      return await operation(await this.databaseProvider());
    } catch (error) {
      throw toStorageAppError(error, "The import session could not be saved.");
    }
  }
}
