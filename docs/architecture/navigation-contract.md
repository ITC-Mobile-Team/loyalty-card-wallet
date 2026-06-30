# Navigation Contract

This contract defines the app route structure expected by the design and implementation plans.

## Route Model

Use Expo Router unless a later ADR changes the navigation stack.

Planned route groups:

| Route | Presentation | Purpose |
| --- | --- | --- |
| `/` | Redirect | Send users to the Cards tab. |
| `/(tabs)/cards` | Tab | Main wallet grid. |
| `/(tabs)/stores` | Tab | Store discovery area backed by city search or user-initiated location lookup. |
| `/(tabs)/account` | Tab | Local account/settings, export/import, and privacy information. |
| `/add/catalog` | Modal | Optional local merchant chooser when catalog data exists. |
| `/add/scan` | Modal or full-screen modal | Scan a barcode for a new card. |
| `/add/manual` | Modal | Enter card data manually. |
| `/add/photo` | Modal | Import card data from an image when implemented. |
| `/add/bulk` | Modal | Select multiple screenshots, review normalized drafts, and selectively save valid cards. |
| `/card/[id]` | Push | Card detail. |
| `/card/[id]/edit` | Modal | Edit card metadata. |
| `/card/[id]/scan-mode` | Full-screen modal | Checkout scanning mode. |
| `/store/[id]` | Push | OpenStreetMap-derived store detail from the Stores tab. |
| `/share/card` | Modal | Preview one shared card from a deep link before importing it. |

Encrypted backup and restore remain grouped actions inside `/(tabs)/account`; they do not add blob-carrying routes.

External phone widgets use:

```text
loyaltycardwallet:///card/<source-card-id>/scan-mode
```

Only a validated active snapshot may create the card-specific link. Missing, stale, revoked, unsupported-future-version, corrupt, or empty widget state uses `loyaltycardwallet://`, which resolves through the existing root redirect to Cards.

## Parameter Rules

- Pass card IDs through routes.
- Pass store IDs through routes.
- Do not pass full card objects through route params.
- Do not pass full store objects through route params.
- Do not pass image blobs or base64 data through route params.
- Scanner success should write draft data to screen state or a draft repository, not permanent card storage, until user confirmation.

## Scanner-First Add Flow

The Phase 3 add-card flow starts at `/add/scan`.

Flow:

1. `/add/scan` requests camera permission only when scanning starts.
2. A successful scan opens an in-screen confirmation form with editable store name, card number, and barcode format.
3. The confirmation action creates the card through the injected card repository interface and navigates to `/card/[id]`.
4. `Enter Manually` opens `/add/manual`, which uses the same confirmation fields without camera access.
5. `Add From Photo` opens `/add/photo`, requests photo-library permission after user action, decodes the selected image when supported, and uses the same confirmation form.

No add-card route passes full card entities, image data, or blobs through route params.

Bulk screenshot import uses `/add/bulk`. The route persists only a session ID and normalized drafts in SQLite. Source images remain owned by the platform picker and are not passed through route params or retained by the app.

## Modal Rules

- Add-card and edit flows are modal.
- The primary add-card entry route is `/add/scan`.
- Card detail is a push navigation from the Cards tab.
- Scanning mode is a full-screen modal because it temporarily changes checkout-focused display behavior.
- Shared card links are modal previews. They do not import until the user explicitly saves the card.
- The root AccessGate overlays all routes when optional app lock is enabled and authentication is required.
- Cold-start or warm deep links may resolve navigation state while locked, but protected route content must remain covered until authentication succeeds.
- Authentication cancellation or lockout stays on the gate without discarding the pending route.
- Widget checkout links follow the same AccessGate policy as all other card routes. A locked launch may resolve the route internally, but scan-mode content remains covered until authentication succeeds.
- Destructive confirmations use native alerts, not custom navigation routes.

## Header And Transition Rules

- Push detail routes should use the native platform back button. Do not replace it with a custom JavaScript back button unless an ADR accepts the loss of native behavior.
- The root navigation theme must keep `background` and `card` colors aligned with `surface.app` so dark screens do not reveal a light underlay during push transitions.
- The root stack should prefer the tabs group as the initial route for normal startup. The `/` redirect remains for URL compatibility, but native splash handoff should keep it hidden during cold launch.
- The native splash must stay visible until the initial Cards route has settled its first data load, so users do not see redirect or loading-only frames between launch and the main wallet.
- Card Detail and Store Detail push transitions must not show a persistent blurred, highlighted, or custom circular back-button background. A native iOS press highlight is acceptable only while the user is actively pressing the back button.
- Real-device iOS QA should check the first push from a tab root into Card Detail and Store Detail because native navigation-bar material effects can differ from simulator and web behavior.

## Tab Rules

MVP tabs are `Cards`, `Stores`, and `Account`.

`Account` does not require sign-in in the MVP. It owns local settings, privacy notes, and export/import actions.

`Account` composes user-facing Backup and Security sections. Diagnostics and maintenance tools stay internal/service-oriented unless a later explicit support or developer surface exposes them. Backup/security failures remain local to Account and must not remove Cards, scanner, or checkout routes.

`Stores` may use OpenStreetMap data through Overpass API for user-initiated discovery. It must not be treated as a discounts API, and Cards, scanner, and checkout workflows must not depend on Stores data.

`Near Me` stays on the existing Stores tab and does not add a route. After the explicit action, the Stores screen may show clearly labeled card suggestions and confirmed merchant-link controls. Confirmation, correction, dismissal, disable, re-enable, removal, and stale-source repair remain in the existing Stores surface. Only card IDs are used when a confirmed suggestion opens Card Detail.

Store detail routes are cache-backed in the MVP. Opening `/store/[id]` before the Stores list has loaded the matching OpenStreetMap object should show a not-found/recovery state instead of making Cards or checkout flows depend on store discovery.
