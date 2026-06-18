# ADR 0003: Offline-First Local Data

## Status

Accepted for MVP

## Date

2026-06-10

## Context

The app must work in a store without network access. The primary checkout flow is opening a card and showing a barcode quickly.

Account sign-in and sync are out of MVP. Losing local data is still a risk, and sharing cards is useful, so export/import is part of the early MVP plan.

## Decision

Store cards locally first, using SQLite behind repository interfaces.

Image storage is governed by ADR 0005. The current decision is to keep card images in app-private data storage through the repository layer instead of storing public or casually browsable image files.

## Rationale

- SQLite is reliable for structured local data and migrations.
- Offline-first behavior keeps the checkout flow independent from servers.
- A future sync layer can be added above repositories without changing screen code directly.

## Consequences

- We need migration discipline from the start.
- Export/import should be added early enough to support backup and card sharing.
- Repository boundaries are important so screens do not depend directly on SQLite.

## Alternatives Considered

- AsyncStorage only: too limited for relational card, picture, and catalog data.
- Cloud database first: adds account, network, and conflict complexity before the local app is useful.
- Plain file URI storage for images: simpler, but rejected by ADR 0005 for the requested privacy model.
