# ADR 0004: Mobile Design Direction

## Status

Accepted on 2026-06-10.

## Context

The MVP needs a focused mobile interface for saving loyalty cards and opening barcodes quickly at checkout. The reference screenshots show a dark native wallet experience with card tiles, modal add flows, scanner flows, and checkout-oriented barcode screens.

## Decision

Use a dark, native mobile utility design for the MVP. The app will use its own visual identity, neutral shell surfaces, user-provided or generated card visuals, and checkout-first screen hierarchy.

The MVP will include:
- Cards tab.
- Offers tab.
- Account tab for local settings, privacy, and export/import.
- Scanner-first add-card flow.
- Manual entry fallback.
- Card detail.
- Scanning mode.
- Edit and delete flows.

The MVP will not include:
- Account sign-in.
- Server-backed merchant catalogs.
- Remote public offers or discounts API dependency.
- Copied third-party artwork or layouts.

## Consequences

- Implementation should prioritize fast card access over decorative onboarding.
- Design tokens and screen specs in `docs/design/` are required context for UI work.
- Offers and Account are persistent product areas, but they stay local-first in MVP.
- Visual QA must happen on real device sizes before release.
