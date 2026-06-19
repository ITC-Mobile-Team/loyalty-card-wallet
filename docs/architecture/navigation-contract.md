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
| `/card/[id]` | Push | Card detail. |
| `/card/[id]/edit` | Modal | Edit card metadata. |
| `/card/[id]/scan-mode` | Full-screen modal | Checkout scanning mode. |
| `/store/[id]` | Push | OpenStreetMap-derived store detail from the Stores tab. |
| `/share/card` | Modal | Preview one shared card from a deep link before importing it. |

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

## Modal Rules

- Add-card and edit flows are modal.
- The primary add-card entry route is `/add/scan`.
- Card detail is a push navigation from the Cards tab.
- Scanning mode is a full-screen modal because it temporarily changes checkout-focused display behavior.
- Shared card links are modal previews. They do not import until the user explicitly saves the card.
- Destructive confirmations use native alerts, not custom navigation routes.

## Header And Transition Rules

- Push detail routes should use the native platform back button. Do not replace it with a custom JavaScript back button unless an ADR accepts the loss of native behavior.
- The root navigation theme must keep `background` and `card` colors aligned with `surface.app` so dark screens do not reveal a light underlay during push transitions.
- Card Detail and Store Detail push transitions must not show a persistent blurred, highlighted, or custom circular back-button background. A native iOS press highlight is acceptable only while the user is actively pressing the back button.
- Real-device iOS QA should check the first push from a tab root into Card Detail and Store Detail because native navigation-bar material effects can differ from simulator and web behavior.

## Tab Rules

MVP tabs are `Cards`, `Stores`, and `Account`.

`Account` does not require sign-in in the MVP. It owns local settings, privacy notes, and export/import actions.

`Stores` may use OpenStreetMap data through Overpass API for user-initiated discovery. It must not be treated as a discounts API, and Cards, scanner, and checkout workflows must not depend on Stores data.

Store detail routes are cache-backed in the MVP. Opening `/store/[id]` before the Stores list has loaded the matching OpenStreetMap object should show a not-found/recovery state instead of making Cards or checkout flows depend on store discovery.
