# ADR 0014: External Card Snapshot Contract

## Status

Accepted.

## Date

2026-06-25

## Context

Phone widgets and possible future watch surfaces need minimum loyalty-card data while the main app is not running. Sharing the primary SQLite database would expose unrelated private data, couple extensions to migrations, and bypass the app's repository and access boundaries. Backup files are encrypted recovery artifacts and are not suitable runtime storage.

## Decision

- Keep SQLite and private image payloads accessible only to the main app.
- Add an independently versioned external snapshot envelope and payload.
- Store only explicitly opted-in cards. Absence means not opted in.
- Include envelope and payload versions, document revision, generated and expiry timestamps, source card ID, per-entry revision, revocation state, merchant display name, card number, barcode format, and optional background color.
- Encode the canonical payload as base64url inside an envelope and protect it with a SHA-256 digest of the encoded payload string.
- Sort entries by source card ID so projection and fixtures are deterministic.
- Retain revoked tombstones without card display/checkout fields so extensions cannot continue displaying deleted or revoked data.
- Treat missing, stale, revoked, unsupported-future-version, and corrupt snapshots as typed outcomes.
- Resolve active entries to the existing scan-mode deep link. Every other outcome resolves to the Cards fallback.
- Keep storage behind injected ports. Native adapters may use platform shared containers, but domain projection and validation remain testable without native code.
- Keep SQLite schema version 3. External opt-in state is represented by active snapshot entries, not a card-table column.

## Rationale

One minimal document is small enough for widget storage, allows atomic replacement, and provides a global revision for cache invalidation. A base64url payload makes integrity verification identical in TypeScript, Swift, and Kotlin without depending on platform-specific JSON key ordering. Revoked tombstones prevent stale extension state from being mistaken for active consent.

## Consequences

- The main app must refresh or revoke snapshots after opted-in card changes.
- Snapshot expiry intentionally forces a safe app-open fallback after prolonged lack of refresh.
- Widgets cannot show notes, images, diagnostics, backup material, coordinates, or other private metadata.
- Integrity detects accidental corruption and unsupported mutation; it is not a secret or an authentication mechanism against a compromised device.
- Future payload versions require explicit decoders and golden fixtures.

## Alternatives Considered

- Share SQLite through App Groups or copied database files: rejected because it exposes unrelated data and couples extensions to migrations.
- Reuse encrypted backup files: rejected because recovery containers are too broad, passphrase protected, and operationally unsuitable for widget reads.
- Store one unversioned JSON object per card: rejected because revision, revocation, corruption, and migration behavior would be inconsistent.
- Store images or pre-rendered barcodes: rejected because they increase sensitivity and size; native widgets can render minimum text and deep-link to checkout.
