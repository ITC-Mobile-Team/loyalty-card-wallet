# Module Boundaries

## Cards

Owns:

- card entity behavior,
- card list and detail use cases,
- create, update, delete operations,
- notes and picture associations.

Does not own:

- raw camera scanning,
- barcode image generation internals,
- image picker platform behavior.

## Scanner

Owns:

- camera permission state,
- scanner screen behavior,
- scan result normalization,
- duplicate scan debouncing.

Does not own:

- saving cards,
- rendering final checkout barcodes,
- choosing long-term barcode format policy.

## Barcode

Owns:

- supported barcode formats,
- validation rules,
- renderer adapter,
- display formatting for card numbers,
- scanning mode layout rules related to barcode readability.

Does not own:

- camera access,
- card persistence.

## Images

Owns:

- camera/library source selection,
- crop configuration,
- copying images into persistent app storage,
- storing image payloads through the app-private data layer,
- thumbnail generation if needed,
- deleting unused app-owned image payloads and temporary import files.

Does not own:

- card form state,
- visual design of card tiles except image shape requirements.

## Storage

Owns:

- SQLite connection lifecycle,
- migrations,
- repositories,
- transaction helpers,
- migrated database provider composition,
- private image payload persistence.

Does not own:

- screen state,
- direct UI formatting.

## Sharing

Owns:

- export bundle creation,
- import bundle validation,
- duplicate import handling,
- per-card import transaction orchestration through the storage runner,
- user-visible warnings before sharing sensitive card data.

Does not own:

- card editing UI,
- scanner behavior,
- remote sync.

## Stores

Owns:

- city-based store discovery,
- user-initiated nearby store lookup,
- OpenStreetMap/Overpass result mapping,
- bounded store search, local filtering, and cache-backed store detail behavior,
- OpenStreetMap attribution display requirements.

Does not own:

- loyalty card persistence,
- real discounts, coupons, or offers,
- account sign-in,
- checkout barcode behavior.
