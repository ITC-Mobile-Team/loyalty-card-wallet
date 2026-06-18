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
