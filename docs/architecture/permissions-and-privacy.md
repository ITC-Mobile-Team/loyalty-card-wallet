# Permissions And Privacy

The MVP stores loyalty cards locally and does not require an account.

## Permissions

| Permission | Used for | Required at launch | Fallback |
| --- | --- | --- | --- |
| Camera | Barcode scanning and optional card artwork capture. | No | Manual entry and photo import. |
| Photo library | Importing card artwork or barcode images. | No | Manual entry and default card artwork. |
| Location | Finding nearby stores in the Stores tab. | No | City-based store search. |
| Local storage | Saved cards, private image payloads, export/import metadata. | Yes | Show storage error and avoid data loss. |
| Biometrics or device credential | Optional app unlock and full-wallet backup reauthentication. | No | Keep app lock disabled or retry through operating-system recovery. |
| iOS App Group capability | Share the minimal opted-in snapshot with the WidgetKit extension. | Build-time only | Widget shows `Open Wallet`; the main app remains fully usable. |

Request camera and photo permissions only when the user starts the related action.
Request location permission only when the user taps the current-location store search action.
Store detail map preview must not request location permission or show the user's location. It only renders the selected store coordinate when one is already available.
Do not request microphone permission for MVP scanner behavior because the app scans barcodes and captures still images only.

## Scanner-First Add Flow

- `/add/scan` requests camera permission only after the user starts scanning.
- `/add/photo` requests photo-library permission only after the user chooses photo import.
- Scanner and photo adapters map denied permissions and platform failures to `AppError`.
- Scan results become editable draft state first. The app does not save a card until the user confirms the card number, barcode format, and store name.
- Manual entry remains available when camera or photo access is denied.

Scan-from-photo uses on-device barcode decoding on the selected image URI. iOS uses the local Apple Vision decoder for supported one-dimensional and QR barcode formats because Expo Camera image decoding is QR-only on iOS. Android keeps the Expo Camera selected-image decoding path. Platform support is not identical across iOS and Android, so failed or unsupported image decoding must keep the user in the add flow with manual entry available.

## Privacy Rules

- Store card data on device by default.
- Do not send card numbers, card images, or merchant names to a server in the MVP.
- Do not require sign-in.
- Do not use analytics that collect card numbers or user-entered merchant data.
- Do not include third-party merchant artwork unless it is licensed, user-provided, or generated as a generic placeholder.
- Do not persist card images as public photo-library assets.
- Do not upload selected barcode photos for decoding; scan-from-photo decoding stays on device.
- Bulk screenshot import decodes selected images on device with bounded concurrency and persists only normalized drafts. Source image bytes and URIs are not retained.
- Do not request location at app launch. Location is used only for user-initiated nearby store discovery.
- Do not persist the user's current coordinate or a coordinate-derived nearby-query cache key. Nearby results may remain in current in-memory screen state, and store coordinates remain OSM store data rather than user location history.
- Store discovery may send the current coordinate or city name to the configured OpenStreetMap/Overpass endpoint. The app must keep card numbers and card images out of store-discovery requests.
- Nearby matching reads local merchant names and aliases on device. Card numbers, card images, notes, and private image references are not sent to Overpass.
- Confirmed merchant links store a stable local merchant key, display name/aliases, and optional OSM source/type/id. OSM evidence can be repaired without replacing the local association.
- Normalized-name candidates are suggestions only and are never persisted silently.
- Keep card images behind the app-private data layer. This prevents casual browsing, but it is not a substitute for encrypted storage on compromised devices.
- Export/import bundles contain sensitive card data and must be user-initiated.
- Full-wallet backup files are passphrase encrypted and user controlled. Forgotten passphrases cannot be recovered.
- Optional biometric app lock protects app access on an already unlocked device; it does not encrypt SQLite or private image payloads at rest.
- Local diagnostics are bounded and redacted before storage. They are exported only after explicit user action and are never uploaded automatically.
- Widgets receive only explicitly selected cards through a separate versioned snapshot. The snapshot contains source card ID, revision/timestamps, revocation state, merchant display name, card number, barcode format, and optional background color.
- External snapshots must not contain notes, private image bytes or references, diagnostics, passphrases, encryption keys, precise coordinates, backup payloads, or non-selected cards.
- Revocation and card deletion replace active data with a tombstone that contains no display or checkout fields.
- Widget extensions/providers do not query SQLite and do not present app authentication prompts. Their links enter the app behind the root AccessGate.
- Apple Wallet and Google Wallet export are no-go because arbitrary third-party cards cannot be issued safely without issuer ownership, protected signing credentials, policy approval, and operational infrastructure.
- Apple Watch and Wear OS are no-go for Phase 3 shipping pending stable phone-widget evidence, separate signed apps, synchronization, and device QA.

## Permission Denied Behavior

Camera denied:
- Explain that scanning needs camera access.
- Keep manual entry visible.
- Provide a route to system settings only when platform APIs support it.

Photo library denied:
- Explain that image import needs photo access.
- Keep existing card image unchanged.
- Keep manual card creation available.

Location denied:
- Explain that nearby store search needs location access.
- Keep city-based store search available.
- Do not block Cards, scanner, or checkout workflows.
- Do not create, update, or remove a merchant link as a side effect of the failed request.

Export/import:
- Warn that exported bundles include loyalty card numbers and images.
- Let users choose whether to export one card or all cards.
- Preview import counts before writing imported cards.

Biometric authentication:
- Do not request authentication at launch unless the user enabled app lock.
- Cancellation or lockout keeps protected content behind the root AccessGate.
- A locked deep link must not bypass authentication.
- Failure to enable, disable, or use app lock must not damage card data.

Encrypted backup:
- Require a user-entered passphrase and explain that it cannot be recovered.
- Reauthenticate before full-wallet export when app lock is enabled.
- Authenticate and validate the full container before restore writes.
- Remove partial temporary output after cancellation or failure.

## App Store Copy Inputs

Camera usage should explain barcode scanning and optional card photo capture.

Photo library usage should explain selecting card artwork or importing barcode images.

Location usage should explain finding nearby stores.

Microphone usage should not be present in MVP app configuration.
