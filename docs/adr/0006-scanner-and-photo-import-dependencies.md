# ADR 0006: Scanner And Photo Import Dependencies

## Status

Accepted on 2026-06-10.

Amended on 2026-06-11 for iOS Vision scan-from-photo support.

Amended on 2026-06-18 for checkout barcode brightness support.

## Context

Phase 3 (`LCW-3`) requires a scanner-first add-card flow with camera barcode scanning, manual entry, scan-from-photo fallback, and confirmation before local persistence.

The app already uses Expo and React Native. The scanner module needs platform camera and media-library access while preserving the clean architecture boundary: screens and reusable views must not import camera, photo-library, SQLite, or filesystem implementations directly.

## Decision

Use Expo-managed packages for this phase:

- `expo-camera` for camera permission requests, camera preview scanning, and barcode decoding from selected image URIs when supported.
- `expo-brightness` for temporarily raising screen brightness while checkout barcode screens are focused.
- `expo-image-picker` for user-initiated photo-library selection.
- A local iOS Expo module backed by Apple Vision for scan-from-photo decoding of supported one-dimensional barcodes on iOS.

The scanner feature owns these dependencies. Expo APIs are wrapped behind scanner ports/adapters and injected through the app dependency provider. Pure scan normalization, validation, and debounce behavior stay outside React Native and Expo APIs so they can be unit tested.

The local Vision module is owned by `modules/ios-vision-barcode-decoder/` and is reached only through the scanner data adapter. Feature screens continue to depend on `ScannerService`, not on Vision, Swift, or generated native project files.

Checkout barcode brightness uses the app-level `setBrightnessAsync` API and stores the previous value before raising brightness. The app restores the saved brightness when the Card Detail or Scan Mode route loses focus, unmounts, or the app moves out of the foreground. It does not use Android's system-wide brightness API and does not request `WRITE_SETTINGS`.

## Rationale

- Expo packages match the existing managed app stack and are installed with `npx expo install` for SDK-compatible versions.
- The camera permission is requested only when the user starts scanning.
- The photo-library permission is requested only when the user starts scan-from-photo.
- Expo Go support is sufficient for MVP validation; production builds can continue using Expo configuration plugins for native permission strings.
- Using ports keeps later native scanner replacement isolated from feature screens and card persistence.
- Expo Camera's selected-image decoding is not enough on iOS for real loyalty cards because iOS image scanning is QR-only in the Expo API. Apple Vision can decode the required one-dimensional formats on device.
- Expo Brightness is the official Expo package for screen brightness control and is bundled for the current SDK line.

## Consequences

- `app.json` must include camera and photo usage strings.
- App source should import Expo module loading helpers from `expo`, not from `expo-modules-core` directly.
- Device or simulator QA is required for allowed, denied, and unavailable permission states on iOS 18.0 and Android 11/API 30.
- Scan-from-photo must remain a fallback; if a platform cannot decode a selected image, the app returns an `AppError` and keeps manual entry available.
- Card creation still goes through card use cases and the injected `CardRepository`; scanner adapters never save cards.
- Expo Go cannot validate the iOS Vision module. iOS photo barcode QA requires a local development build or Xcode run after Expo autolinking sees the local module.
- Barcode brightness boost should be treated as best-effort. If the native brightness API is unavailable or fails, the barcode screen remains usable and does not block checkout.
- On iOS, app-set brightness can persist until the app restores it or the device locks, so route blur, unmount, and app background cleanup must restore the saved value.

## Alternatives Considered

- Manual-only MVP: rejected because scanner-first add flow is required for `LCW-3`.
- Third-party native scanner packages: deferred because Expo Camera covers the needed MVP scanner behavior without adding custom native project maintenance.
- Editing generated `ios/` files directly: rejected because generated native folders are ignored and should remain reproducible from source-controlled Expo config and local modules.
- Direct camera imports in screens: rejected because it would break the repository's clean architecture rules.
