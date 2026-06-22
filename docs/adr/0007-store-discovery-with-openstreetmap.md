# ADR 0007: Store Discovery With OpenStreetMap

## Status

Accepted.

## Date

2026-06-15

## Context

The app needs a lightweight way to show a list of stores without adding a proprietary merchant catalog or a remote offers provider. OpenStreetMap has public store data, and Overpass API can query that data by city area or nearby coordinates.

This data is not a discounts or loyalty-offers API. It can help users find store names, but it does not provide verified offers, card programs, logos, or brand-owned metadata.

## Decision

Use OpenStreetMap data through Overpass API for the first Stores discovery slice.

The app will:

- expose a `StoreRepository` domain interface,
- implement `OverpassStoreRepository` in the data layer,
- call Overpass through the shared `HttpClient` boundary,
- request foreground location only after the user taps `Near Me`,
- use `expo-location` as the location adapter,
- paginate and filter results locally after loading the city or nearby store set,
- show OpenStreetMap attribution next to OSM-derived results.

## Rationale

- Overpass supports small read-only queries without a custom backend for a pet project.
- The clean architecture boundary keeps Overpass replaceable by a local catalog, paid provider, or backend later.
- Foreground-only location access is enough for user-initiated store discovery and keeps privacy scope narrow.
- Local filtering avoids sending a public API request for each search keystroke.

## Consequences

- Store discovery depends on network availability and public Overpass reliability.
- Results can be incomplete or inconsistent because OSM tagging varies by city and contributor coverage.
- The app must keep OSM attribution visible for OSM-derived store data.
- Location behavior requires manual QA on iOS 18.0 and Android 11/API 30 devices or simulators.
- A production release may need a backend proxy, paid provider, OSM extracts, or a private Overpass instance if usage grows.

## Alternatives Considered

- Keep Offers empty: safest for MVP, but does not address store discovery.
- Bundle a static merchant catalog: better offline behavior, but requires data sourcing and maintenance.
- Use a commercial places API: better consistency, but adds API keys, terms, billing, and more privacy review.
- Run a backend proxy immediately: cleaner control over rate limits and privacy, but too much infrastructure for this slice.
