# ADR 0009: Resumable Bulk Import Sessions

## Status

Accepted on 2026-06-24.

## Context

Bulk screenshot migration can decode some images successfully while other images fail, the user cancels, or the app terminates. Source screenshots contain sensitive data and must not become long-lived application storage.

## Decision

- Store one `import_sessions` record and normalized `import_drafts` records in SQLite.
- Persist detected card fields, review state, safe errors, duplicate context, and imported card IDs.
- Do not persist source screenshot URIs or bytes.
- Decode selected images with bounded concurrency.
- Commit each valid draft independently and return a structured per-item result.
- Require a barcode format to be validatable and renderable before a draft can be saved as a card.

## Consequences

- Successfully decoded drafts survive app termination and can be reviewed later.
- Failed source images must be selected again because the application intentionally does not retain them.
- Partial success does not discard valid drafts.
- ITF and QR may be detected, but remain blocked until checkout rendering and validation support exist.
