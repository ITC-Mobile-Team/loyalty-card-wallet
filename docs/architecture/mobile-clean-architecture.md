# Mobile Clean Architecture

This document defines the implementation architecture for the React Native Expo app.

## Goals

- Keep modules independent.
- Keep screens thin.
- Keep domain logic testable without React Native, Expo, SQLite, camera, or network APIs.
- Keep platform APIs behind adapters.
- Make future API/sync work additive instead of forcing rewrites.
- Preserve a design system and component structure that is easy to understand for an iOS developer.

## Source Layout

```text
app/
  _layout.tsx
  (tabs)/
  add/
  card/
src/
  core/
    di/
    errors/
    network/
    storage/
  domain/
    cards/
    stores/
    account/
    sharing/
    backup/
    security/
    diagnostics/
    external-surfaces/
  data/
    cards/
    images/
    stores/
    sharing/
    external-surfaces/
  features/
    cards/
    scanner/
    barcode/
    images/
    stores/
    account/
    sharing/
  components/
    ui/
    views/
  design/
    tokens.ts
    theme.ts
```

## Layer Rules

### `app/`

Owns Expo Router route files and navigation layouts only.

Rules:
- route files stay thin,
- route files import screen containers from `src/features/*`,
- route files may call router APIs,
- route files must not contain business logic,
- domain and data layers must not import from `app/`.

### `src/domain/`

Owns pure business types and interfaces.

Examples:
- `Card`,
- `BarcodeFormat`,
- `CardRepository`,
- `ImageStore`,
- `ExportBundle`.

Rules:
- no React imports,
- no Expo imports,
- no SQLite imports,
- no network implementation imports,
- no navigation imports.

### `src/data/`

Owns concrete implementations for repositories, storage, import/export, and future API clients.

Rules:
- may depend on `src/domain/`,
- may depend on platform adapters in `src/core/`,
- must not import screen components,
- maps raw storage/network/platform errors to `AppError`.

### `src/features/`

Owns use cases, feature hooks, and screen containers.

Rules:
- screens orchestrate UI state and use cases,
- feature hooks call dependency interfaces,
- features do not import concrete SQLite/network implementations directly,
- features may import design-system and view components.

### `src/components/ui/`

Owns reusable design-system primitives.

Examples:
- `AppText`,
- `Screen`,
- `IconButton`,
- `ListRow`,
- `SearchField`,
- `BottomSheet`.

Rules:
- components are reusable,
- no card-specific business logic,
- one custom component per file,
- props should be typed and small.

### `src/components/views/`

Owns composed custom views that can be reused across screens.

Examples:
- `CardsGridView`,
- `BarcodePanelView`,
- `ScannerActionsView`,
- `AccountExportImportView`.

Rules:
- one custom view per file,
- view components receive data and callbacks through props,
- view components do not call repositories, routers, camera, SQLite, or network directly.

## SOLID Mapping

- Single Responsibility: route files route, screens orchestrate, use cases decide, repositories persist.
- Open/Closed: adding API sync should add repository implementations and use cases, not rewrite screens.
- Liskov Substitution: fake repositories must be usable anywhere real repositories are used.
- Interface Segregation: use small interfaces such as `CardRepository`, `ImageStore`, `HttpClient`, and `BarcodeRenderer`.
- Dependency Inversion: features depend on interfaces from domain/core, not concrete platform implementations.

## Dependency Injection

Use React Context providers as the dependency injection boundary.

```ts
type AppDependencies = {
  appInfoProvider: AppInfoProvider;
  cardRepository: CardRepository;
  imageStore: ImageStore;
  barcodeRenderer: BarcodeRenderer;
  interactionFeedback: InteractionFeedback;
  networkManager: NetworkManager;
  errorReporter: ErrorReporter;
  textShareService: TextShareService;
  backupService: BackupService;
  localAuthService: LocalAuthService;
  localSecuritySettingsStore: LocalSecuritySettingsStore;
  localDiagnosticsService: LocalDiagnosticsService;
  externalSnapshotRepository: ExternalSnapshotRepository;
  merchantLinkRepository: MerchantLinkRepository;
};
```

Root layout should wrap the app with providers:

```tsx
<AppProviders>
  <ThemeProvider>
    <ErrorBoundary>
      <Slot />
    </ErrorBoundary>
  </ThemeProvider>
</AppProviders>
```

Rules:
- production dependencies are created in one composition root,
- tests can provide fake dependencies,
- feature code retrieves dependencies through hooks such as `useDependencies()`,
- do not create repositories directly inside screens.
- platform interaction APIs such as haptics/vibration and native share sheets stay behind injected adapters.
- app-group/app-private widget storage stays behind the injected external snapshot repository; extensions never receive the SQLite provider.

## External Platform Surfaces

Phone widgets use a separate clean-architecture boundary:

```text
Card feature action
  -> ExternalSnapshotRepository port
  -> deterministic snapshot codec
  -> native shared-storage adapter
  -> WidgetKit/AppWidget reader
  -> scan-mode deep link or Cards fallback
```

Rules:

- snapshot projection and validation stay pure and platform independent;
- native modules own atomic shared-container writes and widget reload requests;
- generated extensions/providers read only the external snapshot file;
- no extension imports React, Expo Router, SQLite, BackupService, or private image storage;
- future watch work must transfer the same bounded contract through an explicit watch transport rather than sharing phone storage.

## Navigation

Use Expo Router for screen transitions.

Rules:
- route files live in `app/`,
- route params carry IDs and small primitives only,
- full entities, images, and blobs must not be passed through route params,
- domain and data layers must not know about routes,
- navigation is a UI boundary concern.

## Network Layer

Even before a public API exists, define the network layer as an interface.

Required pieces:
- `HttpClient`,
- `NetworkManager`,
- request timeout handling,
- JSON parse handling,
- typed `NetworkError`,
- mapping to `AppError`.

No feature should call `fetch` directly. Future API work should use the network layer.

Nearby-card matching follows the same boundary:

```text
Near Me action
  -> foreground LocationProvider
  -> StoreRepository origin request
  -> pure deterministic merchant scoring
  -> explicit user confirmation
  -> MerchantLinkRepository
```

Rules:

- location and Overpass calls occur only after `Near Me`;
- keystroke/category filtering is local;
- domain scoring does not import Expo Location, SQLite, React, routes, or network adapters;
- OSM references are evidence, not user-owned identity;
- stale-source state requires a direct batched OSM source-ID resolution; bounded nearby-result absence is insufficient;
- matching never writes without an explicit confirmation or repair action;
- nearby failures do not affect Cards, scanner, checkout, sharing, backup, or external surfaces.

## Error Handling

Use one app-level error model:

```ts
type AppError =
  | { kind: "network"; message: string; retryable: boolean }
  | { kind: "storage"; message: string }
  | { kind: "permission"; permission: "camera" | "photos"; message: string }
  | { kind: "validation"; field?: string; message: string }
  | { kind: "unknown"; message: string };
```

Phase 2 extends this union with stable typed backup and authentication reasons. UI recovery branches on `kind` and `reason`, never on message text.

Rules:
- UI must not display raw SQLite, Expo, or network errors,
- adapters map raw errors to `AppError`,
- use cases decide whether an error is recoverable,
- screens render typed error states.

## Rendering And Data Refresh

React rerenders when props, state, context, or subscribed external stores change.

For MVP:
- use feature hooks such as `useCards()`,
- load data through repositories,
- store loading/error/data state in hooks,
- after mutations, update local state or call `refresh()`,
- keep screens declarative.

Future options:
- add TanStack Query if remote sync and cache invalidation become complex,
- add Zustand only for shared UI/app state that does not belong to a single feature.

Do not add a global state library before a concrete need exists.
