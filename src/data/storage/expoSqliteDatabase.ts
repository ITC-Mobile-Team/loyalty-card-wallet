import * as SQLite from "expo-sqlite";

import type { Database, SqlBindable, SqlRunResult } from "./Database";
import { DATABASE_NAME } from "./schema";

type ExpoDatabase = Awaited<ReturnType<typeof SQLite.openDatabaseAsync>>;

function wrapExpoDatabase(database: ExpoDatabase): Database {
  return {
    execAsync(sql) {
      return database.execAsync(sql);
    },
    async runAsync(sql, params = []): Promise<SqlRunResult> {
      const result = await database.runAsync(sql, [...params]);
      return {
        changes: result.changes,
        lastInsertRowId: result.lastInsertRowId
      };
    },
    getFirstAsync<T>(sql: string, params: readonly SqlBindable[] = []) {
      return database.getFirstAsync<T>(sql, [...params]);
    },
    getAllAsync<T>(sql: string, params: readonly SqlBindable[] = []) {
      return database.getAllAsync<T>(sql, [...params]);
    },
    async withTransactionAsync<T>(task: () => Promise<T>): Promise<T> {
      let result: T | undefined;

      await database.withTransactionAsync(async () => {
        result = await task();
      });

      return result as T;
    }
  };
}

export async function openExpoSQLiteDatabase(databaseName: string = DATABASE_NAME): Promise<Database> {
  const database = await SQLite.openDatabaseAsync(databaseName);
  return wrapExpoDatabase(database);
}

export function createExpoSQLiteDatabaseProvider(databaseName: string = DATABASE_NAME) {
  let databasePromise: Promise<Database> | null = null;

  return function getDatabase(): Promise<Database> {
    databasePromise ??= openExpoSQLiteDatabase(databaseName);
    return databasePromise;
  };
}
