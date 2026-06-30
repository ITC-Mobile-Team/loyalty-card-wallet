# Mobile QA Checklist

## Devices

- Minimum iOS target: iOS 18.0.
- Minimum Android target: Android 11, API level 30.
- Test on at least one iOS device or simulator.
- Test on at least one Android device or emulator.
- Test on a real phone before evaluating barcode readability.
- Run minimum-version checks on simulator/emulator when physical devices are unavailable.
- Also smoke-test on the latest available iOS and Android versions before release.

## Core Flows

- Add card by scan.
- Add card manually.
- Import a mixed multi-screenshot session, correct drafts, save valid cards, and resume after relaunch.
- Share a card from Card Detail through the native share sheet.
- Open a shared card link and save only after preview confirmation.
- Add image from library.
- Add image from camera.
- Edit card details.
- Delete card.
- Restart app and confirm cards persist.
- Open card while offline.
- Open a Store detail with coordinates and verify embedded map preview, `Open in Maps`, and `Copy Coordinates`.
- Search Stores, tap category chips above the result list, and verify the list filters locally without a new location prompt.
- Create an encrypted full-wallet backup through the system file provider and restore it only after preview.
- On Account, focus each backup passphrase field and verify the focused field remains visible above the keyboard on iOS and Android.
- Enable app lock, verify locked launch and timeout resume, and test a deep link while locked.
- Export redacted local diagnostics and inspect the result for sensitive data.
- Explicitly add and remove a card from phone widgets through Card Detail.
- Place the phone widget, open the selected card, and confirm checkout enters scan mode behind AccessGate.
- Tap `Near Me`, inspect labeled card suggestions, and confirm/correct/dismiss a link without leaving the Stores tab.
- Disable, re-enable, remove, and repair a stale merchant link.

## Barcode Readability

- Regenerate the privacy-safe image corpus with `npm run fixtures:barcodes`.
- Run `npm run verify:barcode-corpus:ios` on macOS and record per-format recall and precision.
- Barcode is black on white.
- Quiet zones are not clipped.
- Brightness is sufficient.
- Opening Card Detail and Scan Mode raises screen brightness, then leaving the route restores the previous brightness.
- Card number is readable below the barcode.
- Scanning mode works in normal and rotated layouts.
- iOS Add From Photo decodes a supported one-dimensional barcode fixture, such as an EAN-13 image, in a local development build.
- iOS Add From Photo reports a recoverable no-result error for photos without a readable barcode.
- Android Add From Photo still follows the Expo Camera selected-image path.

## Permission States

- Camera permission allowed.
- Camera permission denied.
- Camera permission does not trigger a microphone prompt for barcode scanning.
- Photo library permission allowed.
- Photo library permission denied.
- Android barcode scanning builds do not request `android.permission.RECORD_AUDIO`.
- Store map preview does not request location permission by itself.
- Location permission is requested only after tapping `Near Me`.
- Location denial or unavailability keeps city search, Cards, scanner, and checkout usable.

## Foreground Nearby Suggestions

- No location request occurs at launch, during city search, or while typing in store search.
- One `Near Me` action performs one foreground location lookup and one nearby origin request.
- Text and category filtering remain local.
- Suggestions are labeled and never persist before confirmation.
- Correction can choose another saved-card merchant.
- An already confirmed link can be corrected from its nearby result or the Merchant Links section while retaining its OSM reference.
- Dismissed merchant/store pairs do not immediately reappear.
- Disabled links do not produce actionable suggestions and can be re-enabled.
- Removing a link requires confirmation.
- A link outside the bounded nearby result is not labeled stale.
- A direct missing OSM source-ID result can be repaired without losing the local merchant/card association.
- Ambiguous and no-match results do not create links.
- Offline, permission, cancellation, stale-source, and storage failures do not affect manual card access.
- Inspect storage/logs and confirm the current coordinate is not persisted.

## Store Map Preview

- iOS development/native build shows Apple Maps preview on a Store detail with coordinates.
- Android development/native build shows Google Maps preview with a configured restricted Android Maps API key.
- Store detail without coordinates omits the map preview and map actions.
- `Open in Maps` launches the platform maps app with the store coordinate.
- `Copy Coordinates` copies the same coordinate string shown on screen and gives visible feedback.
- Web smoke target does not crash when opening a Store detail; native map preview may render fallback.

## Data Safety

- Deleting a card removes its app-owned images.
- Failed image operations do not corrupt card data.
- Failed scan does not create duplicate cards.
- Failed photo barcode decoding does not save a card before confirmation.
- Bulk import does not retain source screenshot data and does not lose valid drafts when another item fails.
- ITF and QR detections remain blocked until they can be rendered at checkout.
- Search, favorite, recent/alphabetical sorting, archive, restore, and filtered empty states preserve one-tap card access.
- Import/export compatibility is tested before schema changes.
- Opening a shared card link does not import automatically.
- Duplicate shared-card import keeps both cards in v1.
- Malformed, unsupported, and oversized shared-card links show recoverable errors.
- Wrong backup passphrases, corrupt/truncated files, future versions, canceled providers, and low storage produce no restore writes.
- Partial backup files are removed after failure.
- Restore validates image MIME type, header, dimensions, byte length, per-image limit, and decoded-total limit.
- Restore reports imported, skipped, and failed cards separately.
- Legacy plaintext format-version-1 import remains available and backward compatible.

## Encrypted Backup And Restore

- iOS 18.0: native file share/provider can save a `.lcwb` backup and Document Picker can select it.
- Android 11/API 30: native share/provider can save a `.lcwb` backup and Storage Access Framework can select it.
- Cancel export and restore provider flows.
- Simulate or fill low temporary storage and confirm no partial output remains.
- Verify a correct passphrase round-trip with favorites, archive state, `lastUsedAt`, notes, background color, primary/additional images, and duplicate policies.
- Verify wrong passphrase, tampered record, truncated file, future envelope, future payload, oversized image, and oversized wallet messages.
- Verify forgotten-passphrase copy states that recovery is impossible.
- Verify Cards, scanner, and checkout still work after backup/restore failure.

## Local Authentication

- iOS 18.0 development/native build: Face ID/Touch ID enrollment, success, cancel, unavailable, and lockout behavior.
- Android 11/API 30: BiometricPrompt/device credential success, cancel, unavailable, and lockout behavior.
- Verify enabled launch lock, background timeout, resume before timeout, manual lock, and sensitive backup-export reauthentication.
- Open a card/share deep link while locked and confirm protected content does not render before unlock.
- Confirm the UI does not claim SQLite is encrypted at rest.

## Local Diagnostics

- Generate backup, restore, provider, authentication, and storage failures.
- Export diagnostics only after explicit user action.
- Confirm the export contains no card numbers, image bytes/base64, passphrases, keys, precise coordinates, URI query secrets, or raw platform error messages.
- Clear diagnostics and confirm the local event count returns to zero.

## Deep Link Sharing

- iOS opens a synthetic shared-card link with:

```sh
xcrun simctl openurl booted 'loyaltycardwallet://share/card?payload=<payload>'
```

- Android opens a synthetic shared-card link with:

```sh
adb shell am start -W -a android.intent.action.VIEW -d 'loyaltycardwallet://share/card?payload=<payload>'
```

- Verify cold start and warm start.
- Verify small phone, large Dynamic Type, and tablet-width preview layout.
- Verify malformed link, duplicate card, import failure, share cancel, and payload-too-large error.

## External Phone Widgets

- Confirm non-selected cards never appear.
- Select multiple cards and verify deterministic ordering where the widget family supports multiple rows.
- Edit an opted-in card and verify the old external value is revoked before the refreshed value appears.
- Delete or remove an opted-in card and confirm the widget no longer shows card data.
- Replace shared storage with missing, stale, revoked, future-version, and corrupt fixtures; confirm `Open Wallet` fallback.
- Inspect the shared snapshot and confirm it contains no notes, image bytes/references, diagnostics, passphrases, keys, precise coordinates, backup records, or non-selected cards.
- iOS 18.0: verify App Group signing, widget gallery presence, small/medium/large layouts, reload, cold/warm deep links, and locked launch.
- Android 11/API 30: verify widget picker presence, resize behavior, reload, cold/warm deep links, and locked launch.
- Record 20 widget-to-rendered-barcode samples per target/device and calculate p50/p95. Target is p50 under 2 seconds and p95 under 3 seconds.
- If signing, simulator/emulator, or hardware is unavailable, record the exact missing evidence instead of inferring a pass.

## Native Journey Harness

- Install Maestro outside the repository and run the platform-tagged flows documented in `docs/qa/native-journey-automation.md`.
- Keep credentials, signing material, private backups, real loyalty-card photos, and provider accounts outside Git.
- Treat system provider, biometric lockout, signed widget placement, Android API 30 location simulation, and real-device performance as manual gates when the platform cannot expose them reliably to Maestro.
