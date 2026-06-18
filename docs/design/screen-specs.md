# Screen Specifications

## Cards

Purpose: show all saved loyalty cards and make the right card reachable in one tap.

Layout:
- Safe-area top with large title `Cards`.
- Add icon button in the top-right corner.
- Optional section label `My cards` when at least one card exists.
- Two-column card grid on phones; one column only on narrow accessibility layouts.
- Persistent bottom tab bar with `Cards`, `Stores`, and `Account`.

States:
- Empty: show a compact empty state with one primary add-card action.
- Loading: show skeleton card tiles only during first database read.
- Error: show retry action and keep the add-card action available if local storage can still write.

Rules:
- Tapping a tile opens card detail.
- Long merchant names wrap without changing neighboring tile size.
- User-created generic cards must look as complete as brand-specific cards.

## Add Card Entry Point

Purpose: start card creation with scanning, because scanning is required in the first working MVP.

Rules:
- The Cards plus button opens `/add/scan` by default.
- Manual entry remains available from the scanner screen as a fallback.
- Photo import remains available from the scanner screen when supported.
- Do not require a merchant catalog before a user can add a card.

## Add Card Catalog

Purpose: help users choose a known merchant or add a generic card quickly when a local catalog exists.

Layout:
- Modal presentation.
- Title `Add Card`.
- Search field pinned below the title.
- Frequently added section when the search field is empty.
- Alphabetical list with optional side index for large catalogs.
- `Other card` row always available.

Rules:
- Search filters by merchant name and aliases.
- No-results state keeps `Other card` visible.
- Choosing a merchant moves to scanner by default.
- Choosing `Other card` moves to manual entry unless scanner is explicitly selected.
- Catalog is optional for MVP and must not depend on a remote public discounts API.

## Scanner

Purpose: capture a card number from a barcode as the primary add-card flow while preserving manual fallback.

Layout:
- Full-screen scanner surface.
- Top title and close control.
- Center scan frame.
- Bottom actions: `Enter manually` and `Add from photo`.

States:
- Permission not requested: explain camera access and request permission from the screen.
- Permission denied: show settings guidance plus manual and photo options.
- Scan success: show confirmation/edit screen before saving.
- Scan failure or unsupported format: keep scanner active and show a non-blocking message.

Rules:
- Manual entry is never hidden.
- Do not save a scanned card until the user confirms merchant and card number.
- Scanner implementation is required in the first full MVP build, not deferred behind a manual-only version.

## Manual Card Entry

Purpose: create a card when scanning is unavailable or unnecessary.

Layout:
- Modal form.
- Fields: card number, store name, optional image.
- Save action in the navigation bar.
- Image source row opens the image source sheet.

Validation:
- Card number is required.
- Store name is required for generic cards.
- Save is disabled until required fields are valid.
- Whitespace and separators may be accepted in input but stored in normalized form.

## Card Detail

Purpose: make the barcode readable at checkout and expose secondary card management.

Layout:
- Push screen from Cards.
- Back button on the left, overflow action on the right.
- Card visual header.
- Large barcode panel.
- Human-readable card number and copy affordance.
- Secondary rows: notes and pictures.

Rules:
- The barcode panel must be visible without scrolling on common phone sizes.
- Overflow contains scanning mode, share card, edit card, and delete card, in that order.
- Share card opens the native text share sheet with a link payload that excludes images.
- Delete requires confirmation.
- During Phase 4, before barcode rendering internals are implemented, the barcode panel may show a high-contrast card-number fallback. Phase 5 owns rendering a scanner-readable barcode.

## Shared Card Preview

Purpose: let a receiver inspect a shared loyalty card link before saving it locally.

Layout:
- Modal presentation at `/share/card`.
- Merchant identity is the first visible content.
- Compact metadata group shows barcode format, card number suffix, and duplicate check result.
- Trust context explains that the card will be stored locally and that nothing is imported until `Save Card`.
- Primary action is `Save Card`; secondary action is `Not Now`.
- Width is constrained on tablet layouts and scrolls on small phones or large Dynamic Type.

States:
- Loading: show that the app is checking the link before saving anything.
- Invalid or unsupported link: show a recoverable message and an `Open Cards` action.
- Duplicate: show that saving keeps a separate copy in v1.
- Importing: disable actions and label the primary action `Saving...`.
- Import failure: keep the preview visible and show a retryable error.
- Success: navigate to the imported card detail when the import result includes an ID.

Rules:
- Do not render raw JSON, base64, or low-level validation errors.
- Do not import silently when the route opens.
- Do not overwrite existing cards silently.
- Do not show or transfer images in v1 share links.

## Scanning Mode

Purpose: maximize scanner compatibility at checkout.

Layout:
- Full-screen dark mode.
- Cancel control at the top.
- Optional explanatory callout.
- Barcode displayed on a white panel with high quiet-zone padding.
- If supported by the barcode format, provide both portrait and rotated layouts.

Rules:
- Increase screen brightness only with user-safe platform behavior; restore it on exit when supported.
- Keep the card number readable.
- No editing actions on this screen.
- During Phase 4, scanning mode may reuse the card-number fallback. Phase 5 owns rotated and scanner-readable barcode rendering.

## Edit Card

Purpose: update card metadata without risking accidental data loss.

Layout:
- Modal form.
- Fields: card number, store name, image.
- Save action in the navigation bar.
- Keyboard-safe layout.

Rules:
- Unsaved changes trigger a discard confirmation before close.
- Save writes to local storage and returns to detail.
- Image changes use the image source sheet.

## Image Source Sheet

Purpose: choose where card artwork comes from.

Actions:
- Camera.
- Photo library.
- Cancel.

Rules:
- If permission is denied, show recovery guidance and keep existing image.
- Image cropping can be deferred after MVP, but selected images must display predictably in card tiles.
- Persist selected images through the app-private data layer, not as user-visible image files.

## Stores

Purpose: help users find store names for card creation without depending on a proprietary merchant catalog.

MVP contents:
- City input with a search action.
- Current-location action that requests foreground location only after user intent.
- Search field that filters store name, category, and address.
- Category chips above the results list that filter the loaded result set by store category, with `All` selected by default.
- Single scrollable list of the bounded OpenStreetMap result set.
- Store detail push screen opened from a store row.
- Loading, empty, error, retry, and attribution states.

Rules:
- Store discovery uses OpenStreetMap/Overpass data, not a discounts or loyalty-offers API.
- Do not block Cards, scanner, or checkout workflows on Stores data.
- Keep OpenStreetMap attribution visible near OSM-derived results.
- Do not send card numbers, card images, or user-created card metadata in store-discovery requests.
- Tapping a store opens `/store/[id]` with only the encoded OpenStreetMap store ID in route params.
- Store detail shows available category, address, coordinates, source, ID, and optional contact metadata; missing OSM fields are omitted.
- Store detail shows a compact embedded map preview when valid coordinates exist.
- Store detail provides `Open in Maps` and `Copy Coordinates` actions when valid coordinates exist.
- Category chips are local filters only; changing a category chip must not send another Overpass request.

## Account

Purpose: match the reference navigation model while keeping the MVP local-first.

MVP contents:
- App version.
- Export/import actions for backing up or sharing cards.
- Privacy note that cards are stored locally.
- Local settings and maintenance actions.

Rules:
- No sign-in requirement in MVP.
- The tab label is `Account`, but it can start as a local account/settings screen.
