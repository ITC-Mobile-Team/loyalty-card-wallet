import type { ExportBundleSummary } from "../../domain/sharing/SharingPorts";
import { toStorageAppError } from "../../core/errors/AppError";
import type { Database, DatabaseProvider } from "../storage/Database";
import type { ExportMetadataStore } from "./ExportMetadataStore";

type MetadataRow = {
  value: string;
};

export class SQLiteExportMetadataStore implements ExportMetadataStore {
  constructor(private readonly databaseProvider: DatabaseProvider) {}

  async getLastExportSummary(): Promise<ExportBundleSummary | null> {
    return this.execute(async (database) => {
      const row = await database.getFirstAsync<MetadataRow>(
        "SELECT value FROM app_metadata WHERE key = ?",
        ["last_export_summary"]
      );

      if (!row) {
        return null;
      }

      return JSON.parse(row.value) as ExportBundleSummary;
    });
  }

  async setLastExportSummary(summary: ExportBundleSummary): Promise<void> {
    await this.execute(async (database) => {
      await database.runAsync(
        "INSERT OR REPLACE INTO app_metadata (key, value, updated_at) VALUES (?, ?, ?)",
        ["last_export_summary", JSON.stringify(summary), new Date().toISOString()]
      );
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
