# Cards Data Model

## Entities

### Card

```ts
type Card = {
  id: string;
  storeName: string;
  cardNumber: string;
  barcodeFormat: BarcodeFormat;
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

## Phase 2 SQLite Tables

The first local schema is `001_create_cards_images_metadata`.

Tables:

- `schema_migrations`: applied migration version, name, and timestamp.
- `app_metadata`: key/value metadata such as `schema_version` and `last_export_summary`.
- `cards`: card identity, store name, card number, barcode format, optional image ids, optional background color, notes, and timestamps.
- `image_payloads`: app-private image bytes keyed by repository-controlled `data_ref`.
- `card_images`: image metadata linked to a card and private payload.

`card_images.data_ref` uses repository-controlled private references such as `private-image:<id>`. It must not be a public photo-library URI or a long-lived casual file URI.
