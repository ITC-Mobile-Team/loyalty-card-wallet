import assert from "node:assert/strict";
import test from "node:test";

import type { Database, SqlRunResult } from "../src/data/storage/Database";
import { runInTransaction } from "../src/data/storage/Database";
import { createMigratedDatabaseProvider } from "../src/data/storage/createMigratedDatabaseProvider";

class FakeDatabase implements Database {
  execStatements: string[] = [];

  async execAsync(sql: string): Promise<void> {
    this.execStatements.push(sql);
  }

  async runAsync(): Promise<SqlRunResult> {
    return { changes: 1 };
  }

  async getFirstAsync<T>(): Promise<T | null> {
    return null;
  }

  async getAllAsync<T>(): Promise<T[]> {
    return [];
  }

  async withTransactionAsync<T>(task: () => Promise<T>): Promise<T> {
    return task();
  }
}

test("migrated database provider opens and migrates once for concurrent callers", async () => {
  const database = new FakeDatabase();
  let openCount = 0;
  let migrateCount = 0;
  const provider = createMigratedDatabaseProvider(
    async () => {
      openCount += 1;
      return database;
    },
    async () => {
      migrateCount += 1;
    }
  );

  const [firstDatabase, secondDatabase] = await Promise.all([provider(), provider()]);

  assert.equal(firstDatabase, database);
  assert.equal(secondDatabase, database);
  assert.equal(openCount, 1);
  assert.equal(migrateCount, 1);
});

test("migrated database provider shares migration failures across concurrent callers", async () => {
  const migrationError = new Error("Synthetic migration failure.");
  let openCount = 0;
  let migrateCount = 0;
  const provider = createMigratedDatabaseProvider(
    async () => {
      openCount += 1;
      return new FakeDatabase();
    },
    async () => {
      migrateCount += 1;
      throw migrationError;
    }
  );

  const [firstResult, secondResult] = await Promise.allSettled([provider(), provider()]);

  assert.equal(firstResult.status, "rejected");
  assert.equal(secondResult.status, "rejected");
  assert.equal(openCount, 1);
  assert.equal(migrateCount, 1);
});

test("runInTransaction uses savepoints for nested storage operations", async () => {
  const database = new FakeDatabase();

  const result = await runInTransaction(database, async () => {
    return runInTransaction(database, async () => "nested-result");
  });

  assert.equal(result, "nested-result");
  assert.deepEqual(database.execStatements, [
    "SAVEPOINT storage_tx_1",
    "RELEASE SAVEPOINT storage_tx_1"
  ]);
});
