# ADR 0021: User-Owned Merchant Links And Foreground Matching

## Status

Accepted.

## Date

2026-06-25

## Context

Nearby store data from OpenStreetMap is incomplete, mutable, and not a safe identity for a user's loyalty-card association. The app needs to suggest relevant cards after an explicit `Near Me` action without retaining location history, silently linking cards, or making checkout depend on location or network services.

## Decision

- Assign cards a stable local merchant key through a separate indexed merchant-identity projection.
- Derive a new merchant key from a conservative normalized merchant name and preserve that key when the card display name changes.
- Store confirmed merchant links by local merchant key.
- Store optional OSM source, element type, element ID, observed name, and user aliases as repairable evidence.
- Treat an OSM reference as stale only after a direct batched source-ID lookup confirms that the referenced node, way, or relation is missing. Absence from a bounded nearby result is not stale evidence.
- Repairing a stale source updates the evidence without changing the local merchant key or card association.
- Persist suggestion dismissals by local merchant key and OSM reference.
- Allow users to disable, re-enable, correct, and remove confirmed links. Correcting a confirmed link changes its merchant association while preserving its OSM evidence.
- Run nearby lookup only after the foreground `Near Me` action.
- Request location only for that action and retain no coordinates after the request result is processed.
- Match normalized store names, brands, and operators against card merchant names and aliases with deterministic thresholds.
- Require explicit confirmation before creating or repairing a link.
- Return typed outcomes for denied permission, unavailable location, network failure, no nearby stores, no candidate, ambiguity, stale source, dismissal, disabled links, cancellation, and storage failure.
- Keep Overpass calls behind `StoreRepository`; keystroke and category filtering remain local.
- Keep confirmed merchant links out of external widget snapshots. Widgets already have the minimum checkout fields and do not need location-derived metadata.

## Consequences

- SQLite schema version 4 adds merchant identity, merchant link, and dismissal tables while preserving existing card data.
- Existing cards receive merchant identities lazily in a bounded transaction before the first merchant lookup.
- Card creation writes the merchant identity projection; card renaming updates the observed name while retaining the stable key.
- Multiple cards can share a merchant key and therefore one confirmed merchant link.
- OSM outages, stale data, and matching failures leave Cards, scanner, checkout, sharing, backup, and widgets available.
- Failure of the supplementary source-ID verification does not create a stale claim or block ordinary nearby candidates.
- Users may need to correct conservative no-match or ambiguous outcomes manually.

## Alternatives Considered

- Use the OSM element ID as identity: rejected because OSM elements can be replaced, retagged, or removed.
- Persist normalized-name matches automatically: rejected because multilingual and franchise names can create unsafe false positives.
- Store precise location history for later suggestions: rejected because it expands privacy scope and is unnecessary for explicit foreground lookup.
- Add merchant-link fields to external snapshots: rejected because widgets do not need them for checkout.
