# Testing Strategy

The MVP should keep tests focused on risks: local data integrity, barcode behavior, navigation, and checkout-critical UI.

## Test Layers

| Layer | Purpose | Examples |
| --- | --- | --- |
| Typecheck | Catch contract drift across modules. | Card model changes, route params, repository interfaces. |
| Unit tests | Validate isolated logic. | Card number normalization, barcode format selection, catalog search. |
| Repository tests | Protect local data behavior. | Create, update, delete, migration, error recovery. |
| Component tests | Verify UI behavior without a full device run. | Empty card grid, validation messages, disabled save button. |
| Manual mobile QA | Validate native behavior. | Camera permissions, scanner fallback, keyboard handling, barcode visibility. |
| Visual QA | Catch layout regressions. | Card grid, detail barcode panel, scanning mode, dynamic type. |
| Native journey automation | Repeat high-risk system-boundary flows. | Real-image bulk import resume, permission denial, widget fallback deep links. |

## MVP Test Priorities

1. Card creation and storage.
2. Scanner-first add-card flow.
3. Card editing and deletion confirmation.
4. Barcode rendering from stored card values.
5. Private image persistence and export/import.
6. Scanner fallback paths.
7. Navigation between Cards, Stores, Account, Add Card, Detail, Edit, and Scanning Mode.
8. Bulk-import draft lifecycle, partial success, and organization queries.
9. Encrypted backup golden vectors, authentication-before-write, image verification, and provider cleanup.
10. AccessGate lifecycle/deep-link policy and diagnostics redaction.
11. External snapshot golden fixtures, adapter contracts, revocation, native generation, and widget fallbacks.
12. Merchant-key normalization, deterministic nearby matching, user-owned links, stale-source repair, and foreground-only failure isolation.

## Phase 2 Recovery Coverage

- Golden vectors cover every supported envelope/payload combination: envelope v1 with payload v1 and v2.
- Container tests cover correct and wrong passphrases, tampering, truncation, future envelope, future payload, and payload-v1 migration to current.
- Service tests cover provider cancellation, low storage, partial-file cleanup, oversized images/wallets, and no restore writes after authentication failure.
- Image tests verify MIME/header/dimension consistency before restore.
- AccessGate tests cover launch, resume before/after timeout, cancellation, lockout, and locked deep links.
- Diagnostics tests cover card numbers, image bytes, passphrases, keys, precise coordinates, platform errors, and bounded retention.
- Existing sharing, duplicate, image, organization, barcode/checkout, scanner, store, and migration tests remain regression coverage.

## Phase 3 External Surface Coverage

- Golden fixture covers snapshot envelope v1 plus payload v1.
- Contract tests cover deterministic projection, explicit opt-in, minimum-field enforcement, sorted entries, document/entry revisions, synchronization, revocation tombstones, stale, missing, future envelope/payload, corruption, and unknown-field rejection.
- Shared storage behavior runs against both the in-memory adapter and the native-module wrapper with a fake native module.
- Deep-link tests cover selected card scan mode and safe Cards fallback.
- AccessGate tests cover a locked widget checkout route.
- Expo prebuild inspection verifies generated iOS target/App Group inputs and Android receiver/resources.
- Native builds verify Swift/Kotlin compilation; actual widget placement, tap latency, signing, and minimum-device behavior remain manual evidence.

## Phase 4 Nearby Suggestion Coverage

- Pure tests cover Unicode-safe merchant normalization, stable keys, exact/alias scoring, ambiguity thresholds, no-match behavior, and labeled fixtures at or above 90% precision.
- Shared in-memory and real SQLite merchant-link contract tests cover create/read, confirmed-link correction, disable/re-enable, persisted dismissal, source repair without changing merchant identity, deduplication by OSM reference, and removal.
- Orchestration tests cover permission denial, unavailable location, network failure, no nearby stores, cancellation, storage failure, no silent persistence, and no current-coordinate retention.
- Migration tests execute real SQLite schema version 3 to 4 upgrades, preserving cards, images, import sessions/drafts, catalog overrides, and app metadata. A real forced migration failure verifies transaction rollback and unchanged version-3 data.
- Existing organization, scanner, barcode/checkout, images, sharing, encrypted backup, AccessGate, diagnostics, and external snapshot tests remain regression coverage.

## Test Data

Use synthetic merchant names and synthetic card numbers in tests. Do not commit real loyalty card numbers or real user images.

The executable barcode corpus lives under `test/fixtures/barcodes/`. Regenerate it with:

```sh
npm run fixtures:barcodes
```

On macOS, run the same Apple Vision decoder implementation used by the iOS Expo module and calculate per-format recall and precision:

```sh
npm run verify:barcode-corpus:ios
```

Native black-box journeys live under `.maestro/`. They seed only synthetic fixtures and contain no credentials. See `docs/qa/native-journey-automation.md` for platform commands and manual boundaries.

## Manual QA Checklist Link

Use `docs/qa/mobile-qa-checklist.md` for general device QA and `docs/qa/visual-qa-checklist.md` for screen-level visual QA.

## Done Criteria

For every implemented MVP flow:
- Core logic has tests.
- UI has at least one focused behavior test where practical.
- Permission-denied and validation states are manually checked.
- Known test gaps are recorded in the related plan or PR notes.
