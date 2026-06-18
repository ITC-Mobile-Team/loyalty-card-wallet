# Import And Export Contract

The MVP should support export/import so users can backup cards and share card bundles.

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
  notes?: string;
  images?: ExportedImage[];
};

type ExportedImage = {
  role: "primary" | "additional";
  mimeType: "image/jpeg" | "image/png" | "image/webp";
  data: string;
};
```

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
