# Interaction States

Every user-facing screen must define loading, empty, error, and recovery behavior before implementation.

| Area | Normal | Empty | Error | Recovery |
| --- | --- | --- | --- | --- |
| Cards | Grid of saved cards. | Add-first-card prompt. | Local database read fails. | Retry, then show storage reset guidance only in development. |
| Add catalog | Searchable merchant list. | No search results. | Catalog load fails. | Keep `Other card` available. |
| Scanner | Camera preview with scan frame. | No camera available. | Permission denied, scanner crash, unsupported barcode. | Manual entry and photo import stay available. |
| Photo import | Image picker opens. | No image selected. | Permission denied or unreadable image. | Return to form without changing current image. |
| Manual entry | Form accepts card number and store. | Blank required fields. | Validation fails. | Inline field messages, save remains disabled. |
| Card detail | Barcode and card metadata. | Missing optional notes or pictures. | Barcode cannot render from stored value. | Show card number and edit action. |
| Card share sender | Native share sheet opens with a card link. | Share sheet is dismissed. | Export, encode, or native share fails. | Stay on card detail and show a recoverable share message. |
| Shared card preview | Receiver sees merchant, card summary, duplicate context, and save action. | Missing or malformed payload. | Unsupported link, oversized payload, preview failure, or import failure. | Open Cards, retry Save Card when preview is still valid, or request a new link. |
| Scanning mode | High-contrast barcode display. | No renderable barcode. | Brightness or orientation feature unavailable. | Show standard barcode panel and card number. |
| Edit card | Existing values prefilled. | Optional fields blank. | Save fails. | Keep edits in memory and show retry. |
| Stores | City or nearby store list with text search, category chips, and tappable detail rows. | No stores match the city, location, search term, or selected category. | Location denied, Overpass request fails, timeout, rate limit, unreadable response, or uncached store detail ID. | Retry, choose another city, clear filters, open Stores before detail, or keep Cards and Account tabs usable. |
| Store map preview | Embedded map centered on the store coordinate with one marker. | Missing or invalid coordinates omit the map preview and coordinate actions. | Native map unavailable, Android API key missing, open-maps failure, or clipboard failure. | Keep coordinate text visible when available, show fallback copy, retry actions, or use `Open in Maps` when embedded map fails. |
| Account | Grouped settings list with export/import. | No optional maintenance actions. | Export/import failure. | Explain failed action and preserve local data. |

## Feedback Rules

- Use inline messages for validation.
- Use native alerts for destructive confirmation.
- Use temporary toast-like feedback for copy success.
- Use haptics only as an enhancement, never as the only success signal.
- Keep primary actions available during partial failure whenever data safety allows it.

## Destructive Actions

Delete card flow:
1. User opens overflow from card detail.
2. User chooses delete.
3. App shows confirmation with merchant name and card number suffix.
4. User confirms delete.
5. App deletes locally and returns to Cards.

The app must not delete a card directly from the first action-sheet tap.
