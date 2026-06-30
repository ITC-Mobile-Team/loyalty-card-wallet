# Cards Data Model

## Entities

### Card

```ts
type Card = {
  id: string;
  storeName: string;
  cardNumber: string;
  barcodeFormat: BarcodeFormat;
  isFavorite?: boolean;
  isArchived?: boolean;
  lastUsedAt?: string;
  primaryImageId?: string;
  thumbnailImageId?: string;
  backgroundColor?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
};
```

### CardPicture

```ts
type CardPicture = {
  id: string;
  cardId: string;
  role: "primary" | "additional";
  mimeType: "image/jpeg" | "image/png" | "image/webp";
  width: number;
  height: number;
  byteLength: number;
  dataRef: string;
  createdAt: string;
};
```

### CatalogEntry

```ts
type CatalogEntry = {
  id: string;
  name: string;
  aliases: string[];
  countryCodes: string[];
  logoUri?: string;
  defaultBackgroundColor?: string;
  supportedBarcodeFormats?: BarcodeFormat[];
  priority?: number;
};
```

Catalog entries are bundled, versioned, and generic. User aliases and user-selected artwork references are stored separately in `merchant_catalog_overrides`.

## First Barcode Formats

```ts
type BarcodeFormat =
  | "code128"
  | "code39"
  | "ean13"
  | "ean8"
  | "upca"
  | "upce"
  | "itf"
  | "qr";
```

## Storage Notes

- Store card images through the app-private data layer.
- Do not store permanent card images as public photo-library assets or casually browsable loose files.
- `dataRef` should point to repository-controlled image payloads, not public file paths.
- During the MVP image workflow, `thumbnailImageId` may point to the same private payload as `primaryImageId`. A separate derived thumbnail payload requires an accepted image manipulation dependency or platform adapter update.
- Use ISO strings for timestamps.
- Keep migrations additive when possible.
- Add import/export before experimenting with destructive schema changes.
- Export bundles should include image payloads only when the user explicitly shares or backs up cards.
- Duplicate imported cards may coexist when the user chooses `Keep Both`; duplicate handling belongs to the sharing workflow, not a database uniqueness constraint.
- `isArchived` removes a card from the default wallet query without deleting it.
- `isFavorite` affects wallet ordering and filtering.
- `lastUsedAt` records an explicit card-open action and drives recent sorting.
- `normalized_key` is an indexed implementation field used for batch duplicate lookup.

### Bulk Import Session

`import_sessions` stores the lifecycle of a screenshot migration session. `import_drafts` stores normalized barcode results, review status, safe errors, duplicate context, and imported card IDs. Source screenshot bytes and URIs are not persisted.

### Recovery Metadata

Phase 2 does not add card-table columns. Optional local-security settings are stored as a versioned JSON value in the existing `app_metadata` table. Backup envelope and logical payload versions belong to the external backup file contract, not the SQLite schema version.

Encrypted backup payload v2 preserves card organization fields and private images. Image restore trusts verified JPEG/PNG/WebP headers and measured dimensions, not previously imported placeholder dimensions.

### External Surface Projection

Phase 3 does not add card-table columns. Explicit widget opt-in is represented by an active entry in the separate external snapshot document. Default is no entry and therefore no external copy.

External snapshot payload v1 includes:

- document version, revision, generated timestamp, and expiry timestamp;
- source card ID;
- entry revision and generated timestamp;
- active or revoked state;
- active-only store name, card number, barcode format, and optional background color.

Revoked entries are tombstones and contain no store name, card number, format, color, notes, or image data.

### Card Merchant Identity And Links

Phase 4 keeps merchant-link identity separate from the exported `Card` entity and external snapshot contract.

`card_merchant_identities` stores:

- `card_id`;
- stable local `merchant_key`;
- current merchant display name;
- normalized name used by deterministic matching;
- timestamps.

New cards derive a merchant key from the normalized store name. Renaming a card updates the observed display/normalized name but preserves the existing merchant key.

`merchant_links` stores:

- local link ID;
- stable local merchant key;
- user-owned display name and aliases;
- optional OSM source, element type, element ID, and observed name;
- enabled/disabled state;
- timestamps.

One OSM source/type/id may belong to only one confirmed local link. Confirming or correcting the same source updates the existing link instead of creating a competing association. Confirmed-link correction changes the merchant key/display aliases while preserving the source evidence.

`merchant_suggestion_dismissals` stores a dismissed merchant-key and OSM-reference pair so the same suggestion is not immediately repeated.

OSM fields are repairable evidence. They are not the identity of the card or merchant link. Merchant links are not exported to the widget snapshot because checkout already has the minimum required card fields.

## Phase 2 SQLite Tables

The first local schema is `001_create_cards_images_metadata`.

Tables:

- `schema_migrations`: applied migration version, name, and timestamp.
- `app_metadata`: key/value metadata such as `schema_version` and `last_export_summary`.
- `cards`: card identity, store name, card number, barcode format, optional image ids, optional background color, notes, and timestamps.
- `image_payloads`: app-private image bytes keyed by repository-controlled `data_ref`.
- `card_images`: image metadata linked to a card and private payload.
- `card_merchant_identities`: indexed card-to-local-merchant projection used by nearby suggestions.
- `merchant_links`: confirmed, user-owned merchant/store links with optional OSM evidence.
- `merchant_suggestion_dismissals`: persisted suggestion suppression by merchant and OSM reference.

`card_images.data_ref` uses repository-controlled private references such as `private-image:<id>`. It must not be a public photo-library URI or a long-lived casual file URI.
