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
  data/
    cards/
    images/
    stores/
    sharing/
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
