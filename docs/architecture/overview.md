# Architecture Overview

## Product Shape

Loyalty Card Wallet is an offline-first mobile app with a small number of core workflows:

- browse saved loyalty cards,
- add a card with scanner-first flow and manual fallback,
- attach a card image,
- show a scanner-friendly barcode,
- edit or delete saved cards,
- export/import cards for backup and sharing,
- browse Stores and Account tabs that mirror the reference navigation.

## Architectural Style

Use clean, feature-oriented modules with thin screens. The detailed architecture contract is in `docs/architecture/mobile-clean-architecture.md`.

```text
app/
  route screens and navigation layouts
src/
  core/
  domain/
  data/
  features/
  components/
  design/
```

## Dependency Rule

Screens may call feature hooks and services. Feature services may call domain interfaces. Data implementations may call repositories and platform adapters. Components should not call SQLite, filesystem APIs, camera APIs, or network APIs directly unless they are feature-specific adapter components.

```text
route -> feature screen/hook -> use case -> domain interface -> data adapter -> platform API
```

## First Architecture Priorities

- Keep checkout fast and offline.
- Keep scanner and barcode rendering separate.
- Keep image picking, cropping, and persistent storage behind one feature service.
- Keep data access out of React components.
- Keep platform APIs behind adapters.
- Use dependency injection through providers.
- Make navigation params typed and small.

## Non-Goals For MVP

- Backend-driven catalog.
- Account sign-in.
- Cross-device sync.
- Complex global state management.
