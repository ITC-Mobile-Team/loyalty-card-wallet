# Import, Export, Backup, And Restore Contract

The MVP should support export/import so users can backup cards and share card bundles.

Selected-card sharing, legacy plaintext JSON, and encrypted recovery are separate contracts. `SharingService` continues to own selected-card links and plaintext format-version-1 compatibility. `BackupService` owns full-wallet encrypted recovery.

External widget snapshots are a third independent contract. They are not an export, sharing bundle, or backup file. `ExternalSnapshotRepository` owns only explicitly selected minimum card fields for platform runtime surfaces.

## External Snapshot Separation

- Snapshot envelope version 1 contains a base64url canonical payload and SHA-256 integrity digest.
- Snapshot payload version 1 contains document revision, generated/expiry timestamps, and deterministic source-ID-sorted active or revoked entries.
- Active entries contain only source card ID, entry revision/timestamp, store name, card number, barcode format, and optional background color.
- Revoked entries contain source card ID, entry revision/timestamp, and revocation state only.
- Snapshot files never contain plaintext sharing bundles, encrypted backup records, notes, images, diagnostics, passphrases, keys, or coordinates.
- Missing, stale, future-version, corrupt, revoked, and not-selected outcomes open the main app fallback.

## Goals

- Export selected cards or all cards.
- Import cards from a bundle created by the app.
- Preserve card numbers, barcode formats, store names, notes, and card images.
- Keep the format versioned so future schema changes are recoverable.

## Non-Goals

- Cloud sync.
- Account-based sharing.
- Public merchant catalog synchronization.
- Importing unknown third-party wallet formats in MVP.

## Bundle Shape

The Phase 2 implementation uses a versioned JSON bundle. The logical structure is:

```ts
type ExportBundle = {
  app: "loyalty-card-wallet";
  formatVersion: 1;
  exportedAt: string;
  cards: ExportedCard[];
};

type ExportedCard = {
  storeName: string;
  cardNumber: string;
  barcodeFormat: BarcodeFormat;
  backgroundColor?: string;
  isFavorite?: boolean;
  isArchived?: boolean;
  lastUsedAt?: string;
  notes?: string;
  images?: ExportedImage[];
};

type ExportedImage = {
  role: "primary" | "additional";
  mimeType: "image/jpeg" | "image/png" | "image/webp";
  data: string;
};
```

The optional organization fields are backward-compatible additions to format version 1. Older bundles import with default active and non-favorite state.

`data` may be base64 inside JSON for MVP simplicity, or stored as separate files in a zip-like container if large images make JSON too heavy.

Phase 2 uses base64 image payloads inside JSON for MVP simplicity. Export is implemented in the data-layer sharing service, not in screens. Import stores image payloads back through the app-private image store.

## Privacy Rules

- Export is always user-initiated.
- Show clear text that exported bundles contain loyalty card numbers and images.
- Do not export analytics or device identifiers.
- Do not import a bundle silently; preview card count before writing.
- Handle duplicate cards by asking whether to skip, replace, or keep both.

## Validation Rules

- Reject unsupported future `formatVersion` values.
- Reject bundles without `app: "loyalty-card-wallet"`.
- Validate barcode format before importing.
- Resize imported images before storing them.
- Never partially import without reporting which cards succeeded and failed.

Phase 7 import UI previews card count, image count, bundle format version, and duplicate card count before writing. Duplicate detection matches store name case-insensitively plus exact card number and barcode format. The Account tab lets the user choose whether duplicate imports are skipped, replace matching local cards, or are kept alongside existing cards.

Phase 8 hardening changes replacement imports so existing duplicate cards are not deleted until the replacement card and imported images have been created successfully. If replacement import fails while writing the new card or images, the app reports the failed card and keeps the original local duplicate. The Account tab also exposes the generated bundle through the native share sheet after export; this is local user-initiated sharing, not cloud sync.

Storage hardening keeps each card import inside one storage transaction when the app is using the SQLite data layer. For a replacement import, creating the replacement card, saving imported images, updating the primary image pointer, deleting duplicates, and cleaning unreferenced payloads succeed or fail together for that one card. The transaction boundary is not the whole bundle, so later card failures still preserve earlier successful imports and the result can report imported, skipped, and failed counts.

Phase 2 import reports imported, skipped, and failed card counts. Full image resize/normalization remains owned by the later image workflow phase; the current import foundation keeps image bytes private and records failures instead of exposing raw platform or storage errors.

## Encrypted Full-Wallet Backup

Encrypted backups use:

- file magic `LCWBKP01`;
- encryption envelope version 1;
- logical payload versions 1 and 2, with new exports writing payload version 2;
- PBKDF2-HMAC-SHA256 with a random 16-byte salt and 210,000 iterations;
- AES-256-GCM authenticated records;
- authenticated header metadata and record indexes;
- a required encrypted end record with record and decoded-byte totals.

Envelope and payload versions evolve independently. Encrypted payload v1 is decode-only and migrates image dimensions from verified image headers. Payload v2 stores declared image dimensions, which must match the decoded header before restore.

Backup records are bounded manifest, card, image, and end records. The implementation applies card-count, image-count, per-image, per-record, passphrase, and decoded-total limits. It processes records incrementally with writer backpressure and bounded image loading instead of building one whole-wallet JSON/base64 value.

The system document provider is user initiated:

- export writes a temporary encrypted file, presents the native file share/provider UI, and removes the temporary file afterward;
- restore selects a file with the system document picker;
- cancellation, provider failure, low temporary storage, corrupt files, wrong passphrases, future versions, and size-limit failures are typed outcomes;
- forgotten backup passphrases cannot be recovered.

Restore authenticates and validates the complete backup before any card write. The preview reports envelope version, source/current payload versions, card count, image count, decoded size, and export time. Restore then applies the selected duplicate policy through per-card transactions and returns structured imported, skipped, or failed results.

Backup image validation checks:

- supported MIME type;
- JPEG, PNG, or WebP header signature;
- decoded width and height;
- declared width and height for payload v2;
- declared and actual byte length;
- per-image and decoded-total limits.

Biometric reauthentication is required before full-wallet export when optional app lock is enabled. Biometric app lock does not encrypt SQLite at rest.

## Card Share Link Contract

LCW-59 adds a v1 single-card link payload for sharing from Card Detail through the native share sheet.

Route:

```text
loyaltycardwallet://share/card?payload=<base64url-json>
```

Payload:

```ts
type CardShareLinkPayload = {
  app: "loyalty-card-wallet";
  shareKind: "single-card";
  linkVersion: 1;
  createdAt: string;
  bundle: ExportBundle;
};
```

Rules:

- The wrapped bundle must contain exactly one card.
- The wrapped bundle must use `formatVersion: 1`.
- Card Detail exports share links with `includeImages: false`.
- V1 share links reject image payloads even though Account export/import still supports images.
- Encoded payloads are capped by `MAX_SHARE_LINK_PAYLOAD_LENGTH` in the domain codec.
- Link open shows a shared-card preview before import. It must not write to local storage automatically.
- Saving a shared card imports with duplicate strategy `keepBoth` for v1, so an existing local card is not overwritten silently.
- Successful imports can return `importedCardIds` so the receiver can navigate to the saved card detail.
