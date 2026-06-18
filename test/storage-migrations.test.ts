import assert from "node:assert/strict";
import test from "node:test";

import type { Database, SqlBindable, SqlRunResult } from "../src/data/storage/Database";
import { migrateDatabase } from "../src/data/storage/migrateDatabase";
import { assertMigrationListIsContiguous, migrations } from "../src/data/storage/migrations";

class FakeDatabase implements Database {
  execStatements: string[] = [];
  runStatements: { sql: string; params: readonly SqlBindable[] }[] = [];
  schemaVersion: number | null = null;

  async execAsync(sql: string): Promise<void> {
    this.execStatements.push(sql);
  }

  async runAsync(sql: string, params: readonly SqlBindable[] = []): Promise<SqlRunResult> {
    this.runStatements.push({ sql, params });
    return { changes: 1 };
  }

  async getFirstAsync<T>(sql: string): Promise<T | null> {
    if (sql.includes("app_metadata") && this.schemaVersion === null) {
      throw new Error("no such table: app_metadata");
    }

    if (sql.includes("app_metadata")) {
      return { value: String(this.schemaVersion) } as T;
    }

    return null;
  }

  async getAllAsync<T>(): Promise<T[]> {
    return [];
  }

  async withTransactionAsync<T>(task: () => Promise<T>): Promise<T> {
    return task();
  }
}

test("migration list is forward-only and contiguous", () => {
  assert.doesNotThrow(() => assertMigrationListIsContiguous(migrations));
});

test("fresh database migration creates schema and records schema version", async () => {
  const database = new FakeDatabase();

  await migrateDatabase(database, () => "2026-06-10T00:00:00.000Z");

  assert.ok(database.execStatements.some((sql) => sql.includes("CREATE TABLE IF NOT EXISTS cards")));
  assert.ok(database.execStatements.some((sql) => sql.includes("CREATE TABLE IF NOT EXISTS card_images")));
  assert.ok(
    database.runStatements.some(
      (statement) =>
        statement.sql.includes("INSERT OR REPLACE INTO app_metadata") &&
        statement.params[0] === "schema_version" &&
        statement.params[1] === "2"
    )
  );
  assert.ok(
    database.runStatements.some(
      (statement) =>
        statement.sql.includes("INSERT OR IGNORE INTO schema_migrations") &&
        statement.params[1] === "002_allow_duplicate_imported_cards"
    )
  );
  assert.ok(database.execStatements.some((sql) => sql.includes("DROP INDEX IF EXISTS idx_cards_duplicate_lookup")));
});

test("migration rejects unsupported future schema versions", async () => {
  const database = new FakeDatabase();
  database.schemaVersion = 99;

  await assert.rejects(() => migrateDatabase(database), {
    kind: "storage",
    message: /newer than app schema/
  });
});
