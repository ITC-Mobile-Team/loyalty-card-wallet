# Visual QA Checklist

Use this checklist after the app has runnable screens.

## Devices

Verify at minimum:
- Small iPhone viewport.
- Large iPhone viewport.
- Android phone viewport.
- Dynamic Type or font scaling enabled.
- Dark appearance.

## Launch Screen

- Native cold launch starts on `#0A0A0B` with the card-stack mark centered.
- The launch artwork is not stretched, clipped, pixelated, or visibly off-center.
- No Expo default splash, white flash, or mismatched light background appears before the app shell.
- First rendered app screen transitions cleanly from the launch background into the dark Cards screen.
- Verify in native preview or production-style iOS and Android builds; Expo Web, Expo Go, and development-client startup are not final proof of native splash behavior.

## App Icon

- iOS home screen shows the card-stack icon with clean rounded-mask edges.
- Android launcher shows the adaptive card-stack icon without cropping under common launcher masks.
- Android themed icon uses the monochrome card-stack mask and stays recognizable at small sizes.
- Icon artwork feels visually related to the launch screen without looking stretched or overfilled.

## Cards Screen

- Large title and add button are not clipped.
- Card grid has stable tile sizes.
- Long merchant names wrap or truncate cleanly.
- Empty state shows one clear add action.
- Bottom tabs show Cards, Stores, and Account and stay above safe area.

## Stores Screen

- City input, search field, and current-location action fit on small screens.
- Loading, empty, error, and retry states are visible and readable.
- Pagination controls do not overlap the bottom tab bar.
- OpenStreetMap attribution is visible near OSM-derived store results.
- Location permission is requested only after tapping `Near Me`.

## Add Card Flow

- Search field remains visible when keyboard is open.
- No-results state keeps `Other card` visible.
- Scanner, manual entry, and photo fallback are reachable.
- Modal close behavior preserves or confirms unsaved work.
- Cards plus button opens scanner-first add flow unless a later catalog decision changes it.

## Scanner

- Permission prompt appears only after user starts scanning.
- Permission denied state has manual fallback.
- Scan frame is centered and visible.
- Manual entry button is reachable on small screens.

## Card Detail

- Barcode panel is visible without scrolling at normal text size.
- Barcode quiet zone is not clipped.
- Card number is readable and copyable.
- Overflow menu separates destructive delete action.

## Scanning Mode

- Barcode is high contrast on a white panel.
- Cancel control is reachable.
- Rotated layout does not clip barcode or card number.
- Screen remains readable with high font scaling.

## Accessibility

- VoiceOver labels are meaningful.
- Icon-only buttons have labels.
- Touch targets are at least 44 by 44 points.
- Reduced-motion setting does not break transitions.
