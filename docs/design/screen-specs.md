# Screen Specifications

## Cards

Purpose: show all saved loyalty cards and make the right card reachable in one tap.

Layout:
- Safe-area top with large title `Your wallet`.
- Add icon button in the top-right corner.
- The first saved card is presented as a featured wallet card for fast checkout access.
- Remaining cards use stacked rows with merchant identity, card suffix, and a clear row affordance.
- Scanner-first add-card entry remains visible below the saved-card stack.
- Persistent bottom tab bar with `Cards`, `Stores`, and `Account`.

States:
- Empty: show a compact empty state with one primary add-card action.
- Loading: show skeleton card tiles only during first database read.
- Error: show retry action and keep the add-card action available if local storage can still write.
- Filtered empty: explain that no cards match and keep search/filter controls available.

Rules:
- Tapping a tile opens card detail.
- Long merchant names wrap without changing neighboring tile size.
- User-created generic cards must look as complete as brand-specific cards.
- The Cards tab should not show both a native tab header title and an in-screen wallet title.
- Search, recent/alphabetical sort, favorite-only, and archived filters remain above the card list.
- Archived cards are excluded by default and restored from the Archived filter.
- Opening a card records recent use without delaying navigation.

## Bulk Import Review

Purpose: migrate multiple screenshot barcodes without retaining source screenshots or losing successful drafts.

Layout:
- Modal route at `/add/bulk`.
- Compact session summary and filters for all, ready, needs attention, duplicate, and failed drafts.
- Draft rows expose merchant, card number, supported barcode format, status text, and a review action.
- Primary action saves ready drafts; a separate explicit action may keep duplicate cards.

States:
- No session: explain local processing and allow selecting up to 50 screenshots.
- Processing: disable conflicting actions while bounded decoding or persistence runs.
- Needs attention: keep detected values editable and explain the blocking field.
- Failed: show a safe per-image error and require reselection when source data is needed.
- Resumed: reload the active session and normalized drafts after app restart.
- Partial success: imported drafts remain marked while retryable drafts stay available.

Rules:
- Never persist source screenshot bytes or URIs.
- Never save an unrenderable barcode format.
- Cancellation does not delete cards saved before cancellation.

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
- Compact merchant identity row.
- Compact ready-to-scan status panel.
- Large white barcode panel.
- Human-readable card number and copy affordance.
- Brightness status hint while focused.
- Secondary rows for card info and more actions.

Rules:
- The barcode panel must be visible without scrolling on common phone sizes.
- Overflow contains scanning mode, share card, edit card, and delete card, in that order.
- Share card opens the native text share sheet with a link payload that excludes images.
- Delete requires confirmation.
- Card detail temporarily raises screen brightness while focused and restores the previous brightness on exit when supported.
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
- Clearly labeled nearby card suggestions shown only after `Near Me`.
- Confirmed merchant-link management using existing grouped cards, rows, buttons, spacing, and tokens.

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
- Store text filtering is local and must not send an Overpass request on each keystroke.
- A normalized-name match is labeled `Suggestion` and requires confirmation before persistence.
- `Correct` lets the user choose another saved-card merchant.
- `Dismiss` suppresses that merchant/store suggestion.
- Confirmed links expose disable, re-enable, and removal.
- Confirmed links expose correction both from a nearby confirmed result and from the Merchant Links management section.
- A directly verified missing OSM reference is labeled and requires an explicit `Repair Link` action. Absence from the bounded nearby list alone must not label a link stale.
- Permission, network, ambiguity, no-match, dismissal, disabled-link, stale-source, and storage failures keep manual card access available.
- Phase 4 holds the existing dark utility design, navigation hierarchy, tokens, typography, spacing, density, and restrained motion.

## Account

Purpose: match the reference navigation model while keeping the MVP local-first.

Phase 2 contents:
- Local summary and app version.
- Grouped Backup section with passphrase entry, confirmation for export, system file selection, authenticated restore preview, duplicate policy, and structured per-card results.
- Grouped Security section with optional app lock status, enable/disable action, and lock-now action.
- Diagnostics and maintenance tools are hidden from the normal user-facing Account screen unless a later support or developer surface explicitly exposes them.

Rules:
- No sign-in requirement in MVP.
- The tab label is `Account`, but it can start as a local account/settings screen.
- Explain before export that forgotten backup passphrases cannot be recovered.
- Do not display backup passphrases, encrypted bytes, keys, card numbers from diagnostics, or raw platform errors.
- Preview restore counts and versions before writes.
- Show per-card imported, skipped, or failed status after restore.
- State that biometric app lock does not encrypt SQLite at rest.
- Keep the approved dark utility layout, tokens, typography, spacing, and restrained motion.
- Backup or security failure must not block Cards, scanner, or checkout.

## Access Gate

Purpose: cover protected app content when optional local authentication is required.

States:
- Loading settings: keep protected content covered while local policy loads.
- Locked launch or timeout: show one unlock action and the at-rest encryption disclaimer.
- Authenticating: disable duplicate prompt attempts.
- Canceled or failed: remain locked with typed recovery copy.
- Lockout or unavailable: explain operating-system recovery without exposing protected routes.

Rules:
- Cover cold launch, resume after timeout, manual lock, and locked deep links.
- Do not replace native biometric/device-credential prompts.
- Do not add custom motion or change tab/navigation hierarchy.

## Phone Widgets

Purpose: expose only explicitly selected cards and provide a fast path to the existing checkout barcode flow.

Phone widget contents:

- use the approved dark utility direction where native widget APIs permit;
- show merchant name, masked card suffix, and an `Open Barcode` affordance;
- iOS medium/large families may show multiple selected cards; small and Android v1 show the first deterministic active card;
- tapping an active card opens its existing scan-mode route;
- missing, stale, revoked, future-version, corrupt, or empty state shows `Open Wallet` and deep-links to Cards.

Rules:

- Card Detail adds only `Add To Widget` or `Remove From Widget` in the existing action surface; it does not change layout, tokens, typography, spacing, hierarchy, or motion.
- External surfaces do not show notes, images, full diagnostic/error details, coordinates, or backup/security material.
- Extension/widget UI must not imply that app lock can be prompted outside the main app.
