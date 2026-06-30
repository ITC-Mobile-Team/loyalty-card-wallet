# ADR 0011: Encrypted Backup Format

## Status

Accepted.

## Date

2026-06-24

## Context

Full-wallet recovery contains card numbers, notes, organization state, and private images. The existing SharingService creates a plaintext format-version-1 JSON object and materializes base64 images, which is appropriate for legacy sharing compatibility but not for a bounded encrypted backup. Envelope evolution, logical payload evolution, authentication failures, provider cancellation, corruption, and image limits must be handled without partial restore writes.

## Decision

- Keep selected-card links and legacy plaintext v1 import/export in SharingService.
- Add a separate BackupService for full-wallet recovery.
- Use logical payload version 2, encoded by a BundleCodec as bounded manifest, card, image, and end records.
- Use encryption envelope version 1 independently from the payload version.
- Frame the file as a magic prefix, bounded JSON header, and length-prefixed AES-256-GCM records.
- Derive the record key with PBKDF2-HMAC-SHA256 using a random 16-byte salt and 210,000 iterations.
- Authenticate canonical header bytes and each record index as AES-GCM additional authenticated data.
- Require an authenticated end record containing record and decoded-byte totals; missing or mismatched end records are truncation failures.
- Limit cards, images, individual image bytes, record bytes, and total decoded bytes before allocation or restore writes.
- Process one record at a time with writer backpressure. Image loading/export uses bounded concurrency and never an unbounded `Promise.all`.
- Validate restored image signatures, MIME type, decoded dimensions, declared dimensions, and byte length before saving.
- Write exports to a temporary app cache file, invoke the system file-sharing/provider surface, and delete the temporary file after completion, cancellation, or failure.
- Select restores through the system document picker and copy the selected file to readable app cache when required by the platform.
- Treat forgotten passphrases as unrecoverable.

## Rationale

Independent versions allow cryptography and logical schema migrations to evolve separately. Per-record authenticated encryption bounds memory, localizes corruption, and avoids a final whole-wallet JSON/base64 allocation. A required encrypted end record distinguishes a complete stream from a truncated file. System providers keep storage user-controlled without adding an account or cloud service.

## Consequences

- Backup files are not compatible with legacy plaintext v1 JSON, but the app continues to import that format separately.
- Restore must authenticate and validate the complete container before any card write.
- Temporary cache space is required during native export/import.
- Native share sheets do not consistently report whether the user saved a file after the sheet was presented; this platform limitation must be recorded in QA.
- Biometric app lock remains separate from backup encryption and does not encrypt SQLite at rest.

## Alternatives Considered

- Reuse SharingService JSON/base64: rejected because it materializes the wallet and mixes selected-card sharing with recovery.
- One AES-GCM ciphertext for the entire wallet: rejected because it requires whole-payload buffering with the available Expo API.
- Zip archive plus one encrypted file: rejected to avoid another archive dependency and ambiguous nested versioning.
- Device-bound encryption key: rejected because a recovery file must be restorable on another device with the passphrase.
