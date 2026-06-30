import { CURRENT_SCHEMA_VERSION, INITIAL_SCHEMA_SQL } from "./schema";

export type Migration = {
  version: number;
  name: string;
  sql: string;
};

export const migrations: readonly Migration[] = [
  {
    version: 1,
    name: "001_create_cards_images_metadata",
    sql: INITIAL_SCHEMA_SQL
  },
  {
    version: 2,
    name: "002_allow_duplicate_imported_cards",
    sql: "DROP INDEX IF EXISTS idx_cards_duplicate_lookup;"
  },
  {
    version: 3,
    name: "003_add_phase_one_organization_and_import_sessions",
    sql: `
      ALTER TABLE cards ADD COLUMN is_favorite INTEGER NOT NULL DEFAULT 0;
      ALTER TABLE cards ADD COLUMN is_archived INTEGER NOT NULL DEFAULT 0;
      ALTER TABLE cards ADD COLUMN last_used_at TEXT;
      ALTER TABLE cards ADD COLUMN normalized_key TEXT;

      UPDATE cards
      SET normalized_key =
        lower(replace(replace(trim(store_name), ' ', ''), '-', '')) || '|' ||
        barcode_format || '|' ||
        lower(replace(replace(trim(card_number), ' ', ''), '-', ''));

      CREATE INDEX IF NOT EXISTS idx_cards_active_sort
        ON cards(is_archived, is_favorite DESC, last_used_at DESC, store_name COLLATE NOCASE);
      CREATE INDEX IF NOT EXISTS idx_cards_normalized_key ON cards(normalized_key);

      CREATE TABLE IF NOT EXISTS import_sessions (
        id TEXT PRIMARY KEY NOT NULL,
        status TEXT NOT NULL CHECK (status IN ('active', 'completed', 'canceled')),
        total_sources INTEGER NOT NULL CHECK (total_sources >= 0),
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS import_drafts (
        id TEXT PRIMARY KEY NOT NULL,
        session_id TEXT NOT NULL,
        source_index INTEGER NOT NULL CHECK (source_index >= 0),
        source_name TEXT NOT NULL,
        status TEXT NOT NULL CHECK (status IN ('ready', 'needs_attention', 'duplicate', 'failed', 'imported')),
        store_name TEXT,
        card_number TEXT,
        barcode_format TEXT,
        duplicate_card_id TEXT,
        error_code TEXT,
        error_message TEXT,
        imported_card_id TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (session_id) REFERENCES import_sessions(id) ON DELETE CASCADE,
        FOREIGN KEY (duplicate_card_id) REFERENCES cards(id) ON DELETE SET NULL,
        FOREIGN KEY (imported_card_id) REFERENCES cards(id) ON DELETE SET NULL
      );

      CREATE INDEX IF NOT EXISTS idx_import_sessions_status_updated
        ON import_sessions(status, updated_at DESC);
      CREATE INDEX IF NOT EXISTS idx_import_drafts_session_status
        ON import_drafts(session_id, status, source_index);

      CREATE TABLE IF NOT EXISTS merchant_catalog_overrides (
        merchant_id TEXT PRIMARY KEY NOT NULL,
        aliases_json TEXT NOT NULL DEFAULT '[]',
        artwork_image_id TEXT,
        updated_at TEXT NOT NULL
      );
    `
  },
  {
    version: 4,
    name: "004_add_user_owned_merchant_links",
    sql: `
      CREATE TABLE IF NOT EXISTS card_merchant_identities (
        card_id TEXT PRIMARY KEY NOT NULL,
        merchant_key TEXT NOT NULL,
        display_name TEXT NOT NULL,
        normalized_name TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (card_id) REFERENCES cards(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_card_merchant_identities_key
        ON card_merchant_identities(merchant_key, card_id);
      CREATE INDEX IF NOT EXISTS idx_card_merchant_identities_normalized_name
        ON card_merchant_identities(normalized_name, merchant_key);

      CREATE TABLE IF NOT EXISTS merchant_links (
        id TEXT PRIMARY KEY NOT NULL,
        merchant_key TEXT NOT NULL,
        display_name TEXT NOT NULL,
        aliases_json TEXT NOT NULL DEFAULT '[]',
        osm_source TEXT,
        osm_type TEXT CHECK (osm_type IS NULL OR osm_type IN ('node', 'way', 'relation')),
        osm_id TEXT,
        osm_observed_name TEXT,
        is_enabled INTEGER NOT NULL DEFAULT 1 CHECK (is_enabled IN (0, 1)),
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_merchant_links_merchant_key
        ON merchant_links(merchant_key, is_enabled, updated_at DESC);
      CREATE UNIQUE INDEX IF NOT EXISTS idx_merchant_links_osm_reference
        ON merchant_links(osm_source, osm_type, osm_id)
        WHERE osm_source IS NOT NULL AND osm_type IS NOT NULL AND osm_id IS NOT NULL;

      CREATE TABLE IF NOT EXISTS merchant_suggestion_dismissals (
        merchant_key TEXT NOT NULL,
        osm_source TEXT NOT NULL,
        osm_type TEXT NOT NULL CHECK (osm_type IN ('node', 'way', 'relation')),
        osm_id TEXT NOT NULL,
        osm_observed_name TEXT,
        dismissed_at TEXT NOT NULL,
        PRIMARY KEY (merchant_key, osm_source, osm_type, osm_id)
      );

      CREATE INDEX IF NOT EXISTS idx_merchant_suggestion_dismissals_merchant
        ON merchant_suggestion_dismissals(merchant_key, dismissed_at DESC);
    `
  }
];

export function assertMigrationListIsContiguous(list: readonly Migration[] = migrations): void {
  list.forEach((migration, index) => {
    const expectedVersion = index + 1;

    if (migration.version !== expectedVersion) {
      throw new Error(`Migration ${migration.name} has version ${migration.version}; expected ${expectedVersion}.`);
    }
  });

  if (list.length !== CURRENT_SCHEMA_VERSION) {
    throw new Error(`Schema version ${CURRENT_SCHEMA_VERSION} does not match ${list.length} migration(s).`);
  }
}
