import { toStorageAppError } from "../../core/errors/AppError";
import type { Database } from "./Database";
import { runInTransaction } from "./Database";
import { assertMigrationListIsContiguous, migrations } from "./migrations";
import { CURRENT_SCHEMA_VERSION } from "./schema";

type SchemaVersionRow = {
  value: string;
};

function isMissingMetadataTableError(error: unknown): boolean {
  return error instanceof Error && /no such table: app_metadata/i.test(error.message);
}

async function readCurrentSchemaVersion(database: Database): Promise<number> {
  try {
    const row = await database.getFirstAsync<SchemaVersionRow>(
      "SELECT value FROM app_metadata WHERE key = ?",
      ["schema_version"]
    );

    return row ? Number(row.value) : 0;
  } catch (error) {
    if (isMissingMetadataTableError(error)) {
      return 0;
    }

    throw error;
  }
}

export async function migrateDatabase(
  database: Database,
  now: () => string = () => new Date().toISOString()
): Promise<void> {
  try {
    assertMigrationListIsContiguous();
    await database.execAsync("PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL;");

    const currentVersion = await readCurrentSchemaVersion(database);

    if (currentVersion > CURRENT_SCHEMA_VERSION) {
      throw {
        kind: "storage",
        message: `Database schema version ${currentVersion} is newer than app schema version ${CURRENT_SCHEMA_VERSION}.`
      };
    }

    for (const migration of migrations) {
      if (migration.version <= currentVersion) {
        continue;
      }

      await runInTransaction(database, async () => {
        const appliedAt = now();
        await database.execAsync(migration.sql);
        await database.runAsync(
          "INSERT OR REPLACE INTO app_metadata (key, value, updated_at) VALUES (?, ?, ?)",
          ["schema_version", String(migration.version), appliedAt]
        );
        await database.runAsync(
          "INSERT OR IGNORE INTO schema_migrations (version, name, applied_at) VALUES (?, ?, ?)",
          [migration.version, migration.name, appliedAt]
        );
      });
    }
  } catch (error) {
    throw toStorageAppError(error, "Failed to migrate the local database.");
  }
}
