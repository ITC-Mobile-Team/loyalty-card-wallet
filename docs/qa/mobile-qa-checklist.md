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

## Barcode Readability

- Barcode is black on white.
- Quiet zones are not clipped.
- Brightness is sufficient.
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
- Import/export compatibility is tested before schema changes.
- Opening a shared card link does not import automatically.
- Duplicate shared-card import keeps both cards in v1.
- Malformed, unsupported, and oversized shared-card links show recoverable errors.

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
