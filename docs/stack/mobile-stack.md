# Mobile Stack

## Accepted MVP Stack

| Area | Choice |
| --- | --- |
| Framework | Expo + React Native |
| Language | TypeScript |
| Routing | Expo Router |
| Browser smoke target | Expo Web with React Native Web (`react-native-web`) |
| Local database | Expo SQLite |
| File storage | Expo File System |
| Camera and live scanning | Expo Camera (`expo-camera`) |
| Checkout barcode brightness | Expo Brightness (`expo-brightness`) |
| iOS scan from photo | Local Expo module backed by Apple Vision |
| Image picking | Expo Image Picker (`expo-image-picker`) |
| Location | Expo Location (`expo-location`) |
| Store map preview | Expo Maps (`expo-maps`) |
| Native launch screen | Expo Splash Screen (`expo-splash-screen`) |
| Native interface style | Expo System UI (`expo-system-ui`) |
| Backup encryption | Expo Crypto AES-256-GCM plus `@noble/hashes` PBKDF2-HMAC-SHA256 |
| Backup file I/O | Expo File System, Document Picker, and Sharing |
| Local authentication | Expo Local Authentication |
| External snapshot integrity | Expo Crypto SHA-256 in the main app; CryptoKit/MessageDigest in native widgets |
| iOS phone widget | Generated WidgetKit extension with App Group storage |
| Android phone widget | Generated `AppWidgetProvider`/`RemoteViews` with app-private file storage |
| Clipboard | Expo Clipboard (`expo-clipboard`) |
| Barcode rendering | `bwip-js` with React Native SVG rendering |
| Forms | React Hook Form |
| Validation | Zod |
| Icons | Lucide React Native |
| Haptics | Expo Haptics |
| Builds | EAS Build |
| Synthetic barcode fixtures | `bwip-js` plus `pngjs`, development-only |
| Native journey automation | Maestro CLI flows under `.maestro/` |

## Platform Targets

| Platform | Minimum supported version | Notes |
| --- | --- | --- |
| iOS | iOS 18.0 | Build and QA against iOS 18 as the minimum runtime. Newer iOS versions should remain supported unless a dependency blocks them. |
| Android | Android 11, API level 30 | Configure the Android minimum SDK to API 30. Newer Android versions should remain supported unless a dependency blocks them. |

When the Expo app scaffold is created, verify the current Expo SDK support matrix and configure native build properties as needed. Expo documents SDK-level minimum OS support and `expo-build-properties` for native build settings. Use `expo-build-properties` for Android `minSdkVersion: 30`. For iOS on Expo SDK 56 or newer, prefer the built-in `ios.deploymentTarget: "18.0"` config; for older SDKs, verify the correct config path before implementation.

## Ownership Notes

- `src/features/add-card`, `src/domain/scanner`, and `src/data/scanner` own camera scanning behavior.
- `app/` and project setup own Expo Web only as a developer smoke target.
- `src/data/scanner` owns the Expo Camera, Expo Image Picker, and local Vision decoder adapters used by the scanner flow.
- `modules/ios-vision-barcode-decoder` owns the Swift Vision implementation for iOS selected-image barcode decoding.
- `src/features/barcode`, `src/domain/barcode`, and `src/data/barcode` own validation and rendering.
- `src/features/barcode` owns temporary checkout brightness boosting for Card Detail and Scan Mode.
- `src/features/images` and `src/data/images` own image picker, private payload storage, cleanup, and file lifecycle.
- `src/data/storage` owns SQLite setup, database adapters, and migrations.
- `src/data/cards` owns SQLite-backed card repository implementations.
- `src/data/location` owns foreground location access for user-initiated store discovery.
- `src/data/stores` owns OpenStreetMap/Overpass store discovery.
- `src/domain/stores` owns merchant normalization, deterministic scoring, typed outcomes, and merchant-link ports.
- `src/data/stores/SQLiteMerchantLinkRepository.ts` owns indexed merchant identities, confirmed links, dismissals, and stale-source updates.
- `src/data/stores/OverpassStoreRepository.ts` also owns batched direct OSM source-ID resolution used to establish stale evidence.
- `src/features/stores` owns the store detail embedded map preview and coordinate actions.
- `src/features/stores` also owns explicit foreground nearby orchestration and local-only result filtering.
- Project configuration owns the native launch screen through the `expo-splash-screen` config plugin and `assets/splash-icon.png`.
- Project configuration owns native appearance: iOS uses automatic appearance so Expo can select the configured dark splash variant, while Android remains dark through `expo-system-ui`.
- `src/data/images` owns private card image payload persistence.
- `src/data/sharing` owns import/export bundle creation, validation, and metadata.
- `src/data/backup` owns encrypted recovery containers, logical payload codecs, image verification, and system document adapters.
- `src/data/security` owns local-authentication and app-lock settings adapters.
- `src/data/diagnostics` owns bounded redacted local diagnostics.
- `src/domain/external-surfaces` owns the external snapshot contract and typed outcomes.
- `src/data/external-surfaces` owns codecs, repository behavior, and shared-storage adapters.
- `modules/external-snapshot-storage` owns atomic native file access and widget reload notifications.
- `plugins/external-surfaces` owns reproducible WidgetKit/AppWidget project generation.

## Watch List

- Expo SDK minimum platform support can change, so re-check platform targets when upgrading Expo.
- Expo-managed packages should stay aligned with `npx expo install --check` and `npx expo-doctor`.
- Expo Web should remain a smoke target for routing and app-shell rendering; mobile behavior still requires iOS and Android QA.
- Expo camera scanning API behavior can change across SDK versions.
- Expo Camera should remain configured for barcode and still-image use only; do not request microphone/audio permission unless video capture becomes an accepted feature.
- Scan-from-photo support should be tested on both iOS and Android before making it a core flow. iOS requires a local development build or Xcode run because Expo Go cannot load the local Vision module.
- Image cropping behavior is platform-dependent.
- Some barcode libraries may require SVG or image output adjustments in React Native.
- Expo Brightness should use app-level brightness for checkout barcode screens and restore the saved value on route blur, unmount, or app background. Do not request Android `WRITE_SETTINGS` unless an ADR accepts system-wide brightness changes.
- Overpass API is a public read-only OSM service with rate limits and reliability constraints. Store discovery must keep small queries, local filtering, visible attribution, and graceful error handling.
- Expo Location permission prompts must be manually checked on iOS 18.0 and Android 11/API 30.
- Nearby Overpass requests are not cached by user coordinate. Only returned OSM stores are retained in the in-memory detail cache by store ID.
- Expo Maps is currently alpha and is not available in Expo Go. Store map preview QA requires a development/native build.
- Expo Splash Screen config and assets are native build inputs. Expo Web, Expo Go, and development-client startup are not final proof of production splash behavior; verify launch-screen changes with iOS and Android native preview or production-style cold launches.
- Barcode fixture generation dependencies are development-only and produce privacy-safe PNGs under `test/fixtures/barcodes/`; they are not part of the app bundle or barcode renderer.
- Maestro is an external test CLI, not an application runtime dependency. Device/provider/signing gaps remain manual when the required target is unavailable.
- Android store map preview requires a restricted Google Maps Android API key supplied as `GOOGLE_MAPS_ANDROID_API_KEY` before native build. The key must enable Maps SDK for Android and be restricted to package `com.anonymous.loyaltycardwallet` plus the active signing-key SHA-1.
- Expo Local Authentication Face ID requires a development/native iOS build; Expo Go is not sufficient.
- Native file share sheets do not consistently report whether the user saved the presented file after the sheet closed. Treat successful presentation as provider completion and record this limitation in native QA.
- iOS widgets require an Apple Developer App Group and extension provisioning profile matching `group.com.anonymous.loyalty-card-wallet` and `com.anonymous.loyalty-card-wallet.widget`.
- Android v1 uses traditional `RemoteViews` for API 30 compatibility. Launcher layout and tap behavior still require an API 30 emulator/device.
- Apple Wallet and Google Wallet require issuer ownership, credentials, approval, and maintenance outside the current local-only scope.
- Watch surfaces require separate signed/distributed apps and explicit phone-to-watch synchronization; they are not implied by phone shared storage.
