# ADR 0010: Ukraine-First Local Merchant Catalog

## Status

Accepted on 2026-06-24.

## Context

Merchant selection should be faster without requiring a proprietary service, an account, network access, or unlicensed brand artwork.

## Decision

- Bundle a versioned catalog containing generic merchant identity, category, background color, and Ukrainian, Russian, and English aliases.
- Keep unknown merchants first-class through `Other card` and manual entry.
- Do not bundle merchant logos.
- Store user aliases and user-selected artwork references in SQLite overrides.
- Search bundled and user aliases locally.

## Consequences

- Catalog search works offline and does not expose card data.
- Catalog updates ship with application releases.
- Legal ownership of merchant artwork remains outside the bundled catalog.
- User overrides survive catalog version updates.
