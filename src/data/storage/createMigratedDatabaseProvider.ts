import type { Database, DatabaseProvider } from "./Database";
import { migrateDatabase } from "./migrateDatabase";

export function createMigratedDatabaseProvider(
  openDatabase: DatabaseProvider,
  migrate: (database: Database) => Promise<void> = migrateDatabase
): DatabaseProvider {
  let migratedDatabasePromise: Promise<Database> | null = null;

  return function getMigratedDatabase(): Promise<Database> {
    migratedDatabasePromise ??= openDatabase().then(async (database) => {
      await migrate(database);
      return database;
    });

    return migratedDatabasePromise;
  };
}
