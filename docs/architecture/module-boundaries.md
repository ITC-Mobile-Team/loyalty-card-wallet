# Module Boundaries

## Cards

Owns:

- card entity behavior,
- card list and detail use cases,
- create, update, delete operations,
- notes and picture associations.
- favorite, archive, recent-use, search, sorting, and paged wallet queries.

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
- bounded multi-image selection and per-image decode results.

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
- bulk-import session and normalized draft persistence.
- merchant catalog override persistence.

Does not own:

- screen state,
- direct UI formatting.

## Catalog

Owns:

- the versioned Ukraine-first bundled merchant list,
- multilingual alias search,
- generic categories and colors,
- user alias and artwork-reference overrides.

Does not own:

- remote offers or loyalty programs,
- licensed merchant artwork,
- card persistence.

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
- encrypted full-wallet recovery.

## Backup

Owns:

- full-wallet recovery payloads and migrations;
- independently versioned encrypted envelopes;
- bounded record framing, authentication, size limits, and cleanup;
- system backup document source/destination ports;
- restore preview and structured per-card recovery results.

Does not own:

- selected-card links or legacy plaintext sharing;
- app-lock policy;
- cloud sync or passphrase recovery.

## Local Security

Owns:

- local authentication ports and adapters;
- persisted optional app-lock settings;
- root AccessGate lifecycle, timeout, cancellation, lockout, and deep-link policy;
- sensitive-action reauthentication policy.

Does not own:

- SQLite-at-rest encryption;
- backup passphrase derivation;
- route-specific business logic.

## Diagnostics

Owns:

- bounded local diagnostic events;
- redaction before buffering;
- explicit user export and local clear behavior.

Does not own:

- automatic telemetry, analytics, remote upload, or raw platform exception retention.

## External Surfaces

Owns:

- the minimal versioned external-card snapshot contract;
- deterministic card projection, integrity validation, revision, expiry, and revocation;
- explicit per-card widget opt-in state;
- injected shared-snapshot storage ports and native adapters;
- safe widget deep-link resolution and platform fallback outcomes;
- reproducible iOS WidgetKit and Android AppWidget generation.

Does not own:

- the primary SQLite database or private image payloads;
- encrypted backup or selected-card sharing;
- app-lock prompt presentation inside extensions;
- Apple Wallet, Google Wallet, Apple Watch, or Wear OS runtime behavior after their independent no-go decisions.

## Stores

Owns:

- city-based store discovery,
- user-initiated nearby store lookup,
- OpenStreetMap/Overpass result mapping,
- bounded store search, local filtering, and cache-backed store detail behavior,
- OpenStreetMap attribution display requirements.
- stable local card-merchant identities used for nearby matching,
- user-owned merchant/store links and persisted dismissals,
- deterministic candidate scoring and ambiguity policy,
- direct batched OSM source-reference verification before stale repair,
- explicit confirmation, correction, disable, re-enable, removal, and stale-source repair.

Does not own:

- loyalty card persistence,
- real discounts, coupons, or offers,
- account sign-in,
- checkout barcode behavior.
- background location, geofencing, unsolicited notifications, or location history.
- automatic persistence of normalized-name matches.
