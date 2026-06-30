import { DatabaseSync } from "node:sqlite";

import type { Database, SqlBindable, SqlRunResult } from "../../src/data/storage/Database";

export type NodeSqliteTestDatabase = Database & {
  close(): void;
};

export function createNodeSqliteTestDatabase(): NodeSqliteTestDatabase {
  const database = new DatabaseSync(":memory:");
  database.exec("PRAGMA foreign_keys = ON");

  return {
    close() {
      database.close();
    },
    async execAsync(sql: string): Promise<void> {
      database.exec(sql);
    },
    async getAllAsync<T>(sql: string, params: readonly SqlBindable[] = []): Promise<T[]> {
      return database.prepare(sql).all(...bindParams(params)) as T[];
    },
    async getFirstAsync<T>(sql: string, params: readonly SqlBindable[] = []): Promise<T | null> {
      return (database.prepare(sql).get(...bindParams(params)) as T | undefined) ?? null;
    },
    async runAsync(sql: string, params: readonly SqlBindable[] = []): Promise<SqlRunResult> {
      const result = database.prepare(sql).run(...bindParams(params));

      return {
        changes: Number(result.changes),
        lastInsertRowId: Number(result.lastInsertRowid)
      };
    },
    async withTransactionAsync<T>(task: () => Promise<T>): Promise<T> {
      database.exec("BEGIN");

      try {
        const result = await task();
        database.exec("COMMIT");
        return result;
      } catch (error) {
        database.exec("ROLLBACK");
        throw error;
      }
    }
  };
}

function bindParams(params: readonly SqlBindable[]): (string | number | null | Uint8Array)[] {
  return [...params];
}
