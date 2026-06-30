import assert from "node:assert/strict";
import test from "node:test";

import type { Database, SqlBindable, SqlRunResult } from "../src/data/storage/Database";
import { migrateDatabase } from "../src/data/storage/migrateDatabase";
import { assertMigrationListIsContiguous, migrations } from "../src/data/storage/migrations";
import { createNodeSqliteTestDatabase } from "./support/NodeSqliteDatabase";

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
        statement.params[1] === "4"
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
  assert.ok(database.execStatements.some((sql) => sql.includes("CREATE TABLE IF NOT EXISTS import_sessions")));
  assert.ok(database.execStatements.some((sql) => sql.includes("idx_cards_normalized_key")));
  assert.ok(database.execStatements.some((sql) => sql.includes("CREATE TABLE IF NOT EXISTS merchant_links")));
  assert.ok(database.execStatements.some((sql) => sql.includes("card_merchant_identities")));
});

test("schema version 3 upgrades only through the merchant-link migration", async () => {
  const database = new FakeDatabase();
  database.schemaVersion = 3;

  await migrateDatabase(database, () => "2026-06-25T00:00:00.000Z");

  assert.equal(database.execStatements.filter((sql) => sql.includes("card_merchant_identities")).length, 1);
  assert.ok(
    database.runStatements.some(
      (statement) =>
        statement.sql.includes("INSERT OR REPLACE INTO app_metadata") &&
        statement.params[1] === "4"
    )
  );
  assert.equal(
    database.runStatements.some(
      (statement) =>
        statement.sql.includes("INSERT OR IGNORE INTO schema_migrations") &&
        statement.params[1] === "003_add_phase_one_organization_and_import_sessions"
    ),
    false
  );
});

test("merchant-link migration is additive and preserves the cards table", () => {
  const migration = migrations.find((candidate) => candidate.version === 4);
  assert.ok(migration);
  assert.match(migration.sql, /CREATE TABLE IF NOT EXISTS card_merchant_identities/);
  assert.match(migration.sql, /CREATE TABLE IF NOT EXISTS merchant_links/);
  assert.doesNotMatch(migration.sql, /DROP TABLE\s+cards/i);
  assert.doesNotMatch(migration.sql, /DELETE FROM\s+cards/i);
});

test("real schema version 3 upgrade preserves existing cards, images, imports, overrides, and metadata", async () => {
  const database = createNodeSqliteTestDatabase();

  try {
    await seedRealVersionThreeDatabase(database);
    await database.runAsync(
      `INSERT INTO cards (
        id, store_name, card_number, barcode_format, primary_image_id, thumbnail_image_id,
        background_color, notes, created_at, updated_at, is_favorite, is_archived, last_used_at, normalized_key
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        "card-preserved",
        "Preserved Store",
        "12345678",
        "code128",
        "image-preserved",
        "image-preserved",
        "#123456",
        "keep notes",
        "2026-06-24T00:00:00.000Z",
        "2026-06-24T01:00:00.000Z",
        1,
        0,
        "2026-06-24T02:00:00.000Z",
        "preservedstore|code128|12345678"
      ]
    );
    await database.runAsync(
      "INSERT INTO image_payloads (data_ref, bytes, byte_length, created_at) VALUES (?, ?, ?, ?)",
      ["private-image:image-preserved", new Uint8Array([1, 2, 3]), 3, "2026-06-24T00:00:00.000Z"]
    );
    await database.runAsync(
      `INSERT INTO card_images (
        id, card_id, role, mime_type, width, height, byte_length, data_ref, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        "image-preserved",
        "card-preserved",
        "primary",
        "image/png",
        10,
        20,
        3,
        "private-image:image-preserved",
        "2026-06-24T00:00:00.000Z"
      ]
    );
    await database.runAsync(
      "INSERT INTO import_sessions (id, status, total_sources, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
      ["session-preserved", "active", 1, "2026-06-24T00:00:00.000Z", "2026-06-24T00:00:00.000Z"]
    );
    await database.runAsync(
      `INSERT INTO import_drafts (
        id, session_id, source_index, source_name, status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        "draft-preserved",
        "session-preserved",
        0,
        "fixture.png",
        "ready",
        "2026-06-24T00:00:00.000Z",
        "2026-06-24T00:00:00.000Z"
      ]
    );
    await database.runAsync(
      "INSERT INTO merchant_catalog_overrides (merchant_id, aliases_json, artwork_image_id, updated_at) VALUES (?, ?, ?, ?)",
      ["merchant-preserved", "[\"Alias\"]", "image-preserved", "2026-06-24T00:00:00.000Z"]
    );
    await database.runAsync(
      "INSERT OR REPLACE INTO app_metadata (key, value, updated_at) VALUES (?, ?, ?)",
      ["security_settings", "{\"enabled\":true}", "2026-06-24T00:00:00.000Z"]
    );

    await migrateDatabase(database, () => "2026-06-25T00:00:00.000Z");

    const card = await database.getFirstAsync<{
      background_color: string;
      card_number: string;
      is_favorite: number;
      last_used_at: string;
      notes: string;
      store_name: string;
    }>("SELECT store_name, card_number, background_color, notes, is_favorite, last_used_at FROM cards WHERE id = ?", [
      "card-preserved"
    ]);
    assert.deepEqual({ ...card }, {
      background_color: "#123456",
      card_number: "12345678",
      is_favorite: 1,
      last_used_at: "2026-06-24T02:00:00.000Z",
      notes: "keep notes",
      store_name: "Preserved Store"
    });
    assert.equal(
      (await database.getFirstAsync<{ count: number }>("SELECT COUNT(*) AS count FROM card_images"))?.count,
      1
    );
    assert.equal(
      (await database.getFirstAsync<{ count: number }>("SELECT COUNT(*) AS count FROM image_payloads"))?.count,
      1
    );
    assert.equal(
      (await database.getFirstAsync<{ count: number }>("SELECT COUNT(*) AS count FROM import_sessions"))?.count,
      1
    );
    assert.equal(
      (await database.getFirstAsync<{ count: number }>("SELECT COUNT(*) AS count FROM import_drafts"))?.count,
      1
    );
    assert.equal(
      (await database.getFirstAsync<{ count: number }>("SELECT COUNT(*) AS count FROM merchant_catalog_overrides"))
        ?.count,
      1
    );
    assert.equal(
      (
        await database.getFirstAsync<{ value: string }>(
          "SELECT value FROM app_metadata WHERE key = 'security_settings'"
        )
      )?.value,
      "{\"enabled\":true}"
    );
    assert.equal(
      (await database.getFirstAsync<{ value: string }>("SELECT value FROM app_metadata WHERE key = 'schema_version'"))
        ?.value,
      "4"
    );
  } finally {
    database.close();
  }
});

test("merchant-link migration failure is surfaced without advancing schema metadata", async () => {
  class FailingDatabase extends FakeDatabase {
    override async execAsync(sql: string): Promise<void> {
      if (sql.includes("CREATE TABLE IF NOT EXISTS card_merchant_identities")) {
        throw new Error("simulated migration failure");
      }
      await super.execAsync(sql);
    }
  }
  const database = new FailingDatabase();
  database.schemaVersion = 3;

  await assert.rejects(() => migrateDatabase(database), {
    kind: "storage",
    message: "Failed to migrate the local database."
  });
  assert.equal(
    database.runStatements.some(
      (statement) =>
        statement.sql.includes("INSERT OR REPLACE INTO app_metadata") &&
        statement.params[1] === "4"
    ),
    false
  );
});

test("real migration failure rolls back schema version 4 objects and preserves version 3 data", async () => {
  const database = createNodeSqliteTestDatabase();

  try {
    await seedRealVersionThreeDatabase(database);
    await database.runAsync(
      `INSERT INTO cards (
        id, store_name, card_number, barcode_format, created_at, updated_at,
        is_favorite, is_archived, normalized_key
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        "card-before-failure",
        "Safe Store",
        "87654321",
        "code128",
        "2026-06-24T00:00:00.000Z",
        "2026-06-24T00:00:00.000Z",
        0,
        0,
        "safestore|code128|87654321"
      ]
    );
    await database.execAsync("CREATE TABLE merchant_links (id TEXT PRIMARY KEY)");

    await assert.rejects(() => migrateDatabase(database), {
      kind: "storage",
      message: "Failed to migrate the local database."
    });

    assert.equal(
      (await database.getFirstAsync<{ value: string }>("SELECT value FROM app_metadata WHERE key = 'schema_version'"))
        ?.value,
      "3"
    );
    assert.equal(
      (await database.getFirstAsync<{ count: number }>("SELECT COUNT(*) AS count FROM cards"))?.count,
      1
    );
    const identityTable = await database.getFirstAsync<{ name: string }>(
      "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'card_merchant_identities'"
    );
    assert.equal(identityTable, null);
  } finally {
    database.close();
  }
});

test("migration rejects unsupported future schema versions", async () => {
  const database = new FakeDatabase();
  database.schemaVersion = 99;

  await assert.rejects(() => migrateDatabase(database), {
    kind: "storage",
    message: /newer than app schema/
  });
});

async function seedRealVersionThreeDatabase(database: Database): Promise<void> {
  for (const migration of migrations.filter((candidate) => candidate.version <= 3)) {
    await database.execAsync(migration.sql);
    await database.runAsync(
      "INSERT OR REPLACE INTO app_metadata (key, value, updated_at) VALUES (?, ?, ?)",
      ["schema_version", String(migration.version), "2026-06-24T00:00:00.000Z"]
    );
    await database.runAsync(
      "INSERT OR IGNORE INTO schema_migrations (version, name, applied_at) VALUES (?, ?, ?)",
      [migration.version, migration.name, "2026-06-24T00:00:00.000Z"]
    );
  }
}
