# Data Migrations

The MVP stores card data locally. Schema changes must be explicit so local user data is not lost during app updates.

## Versioning

Use a local schema version value stored in SQLite.

Minimum metadata:
- current schema version,
- migration applied timestamp,
- migration identifier.

## Migration Rules

- Migrations are forward-only.
- Every schema change gets a named migration.
- Migrations must be idempotent where practical.
- Production code must not reset the database to solve a migration failure.
- Development reset behavior must be documented and clearly separated from production behavior.

## Naming

Use sequential names:

```text
001_create_cards
002_add_card_images
003_add_card_notes
```

The exact file extension depends on the SQLite tooling selected during implementation.

## Current Migrations

| Version | Name | Purpose |
| --- | --- | --- |
| 1 | `001_create_cards_images_metadata` | Creates schema version tracking, app metadata, cards, private image payloads, and card image metadata. |
| 2 | `002_allow_duplicate_imported_cards` | Removes the duplicate card uniqueness index so import can honor the `Keep Both` strategy. |
| 3 | `003_add_phase_one_organization_and_import_sessions` | Adds favorites, archive, recent-use metadata, indexed duplicate keys, resumable import sessions/drafts, and merchant catalog overrides. |
| 4 | `004_add_user_owned_merchant_links` | Adds indexed card merchant identities, confirmed user-owned merchant links, optional OSM evidence, enabled state, and persisted dismissals. |

The production migration runner applies only migrations with a version greater than the stored `schema_version`. It rejects unsupported future schema versions instead of resetting local data.

Runtime migration ownership is centralized in the composition root. Production code creates the raw Expo SQLite database provider, wraps it with a migrated database provider, and injects that migrated provider into all SQLite-backed adapters. Repositories and stores should assume their provider already returns a migration-ready database; they must not own independent migration promises.

Phase 2 keeps the SQLite schema at version 3. Optional local-security settings use the existing `app_metadata` table, so no forward schema migration is required. Encrypted backup envelope and payload versions are independent external-format versions and must not be confused with `schema_version`.

Phase 3 also keeps SQLite schema version 3. Widget opt-in, revisions, expiry, and revocation live in the independently versioned external snapshot file. Snapshot envelope/payload versions must not be added to `schema_migrations`.

Phase 4 advances SQLite to schema version 4 with one additive forward migration from version 3. Existing cards remain unchanged. Missing card merchant identities are backfilled lazily in batches before the first merchant lookup, and new/renamed cards maintain the projection through the SQLite card repository. No card, image, import, security, diagnostics, backup, sharing, or external snapshot table is dropped or rewritten.

## Testing

Each migration should have tests for:
- fresh database creation,
- upgrade from the previous version,
- preservation of existing card data,
- failure behavior when a migration cannot complete.

Provider-level tests should also cover concurrent first access so multiple adapters cannot start separate migrations for the same database.

## Import And Export Compatibility

If import/export is added:
- include schema version in exported files,
- reject unsupported future versions with a clear message,
- never silently drop unknown card fields,
- avoid exporting real card data in tests.

## Development Reset Policy

A development-only reset can be added after the app scaffold exists. It must:
- be unreachable in production builds,
- explain that local development data will be erased,
- not be used as a substitute for migration tests.
