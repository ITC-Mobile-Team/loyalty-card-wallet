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
| iOS scan from photo | Local Expo module backed by Apple Vision |
| Image picking | Expo Image Picker (`expo-image-picker`) |
| Location | Expo Location (`expo-location`) |
| Store map preview | Expo Maps (`expo-maps`) |
| Native launch screen | Expo Splash Screen (`expo-splash-screen`) |
| Clipboard | Expo Clipboard (`expo-clipboard`) |
| Barcode rendering | `bwip-js` with React Native SVG rendering |
| Forms | React Hook Form |
| Validation | Zod |
| Icons | Lucide React Native |
| Haptics | Expo Haptics |
| Builds | EAS Build |

## Platform Targets

| Platform | Minimum supported version | Notes |
| --- | --- | --- |
| iOS | iOS 18.0 | Build and QA against iOS 18 as the minimum runtime. Newer iOS versions should remain supported unless a dependency blocks them. |
| Android | Android 11, API level 30 | Configure the Android minimum SDK to API 30. Newer Android versions should remain supported unless a dependency blocks them. |

When the Expo app scaffold is created, verify the current Expo SDK support matrix and configure native build properties as needed. Expo documents SDK-level minimum OS support and `expo-build-properties` for native build settings. Use `expo-build-properties` for Android `minSdkVersion: 30`. For iOS on Expo SDK 56 or newer, prefer the built-in `ios.deploymentTarget: "18.0"` config; for older SDKs, verify the correct config path before implementation.

## Ownership Notes

- `features/scanner` owns camera scanning behavior.
- `app/` and project setup own Expo Web only as a developer smoke target.
- `src/data/scanner` owns the Expo Camera, Expo Image Picker, and local Vision decoder adapters used by the scanner flow.
- `modules/ios-vision-barcode-decoder` owns the Swift Vision implementation for iOS selected-image barcode decoding.
- `features/barcode` owns validation and rendering.
- `features/images` owns image picker, crop, and file lifecycle.
- `src/data/storage` owns SQLite setup, database adapters, and migrations.
- `src/data/cards` owns SQLite-backed card repository implementations.
- `src/data/location` owns foreground location access for user-initiated store discovery.
- `src/data/stores` owns OpenStreetMap/Overpass store discovery.
- `features/stores` owns the store detail embedded map preview and coordinate actions.
- Project configuration owns the native launch screen through the `expo-splash-screen` config plugin and `assets/splash-icon.png`.
- `src/data/images` owns private card image payload persistence.
- `src/data/sharing` owns import/export bundle creation, validation, and metadata.

## Watch List

- Expo SDK minimum platform support can change, so re-check platform targets when upgrading Expo.
- Expo-managed packages should stay aligned with `npx expo install --check` and `npx expo-doctor`.
- Expo Web should remain a smoke target for routing and app-shell rendering; mobile behavior still requires iOS and Android QA.
- Expo camera scanning API behavior can change across SDK versions.
- Expo Camera should remain configured for barcode and still-image use only; do not request microphone/audio permission unless video capture becomes an accepted feature.
- Scan-from-photo support should be tested on both iOS and Android before making it a core flow. iOS requires a local development build or Xcode run because Expo Go cannot load the local Vision module.
- Image cropping behavior is platform-dependent.
- Some barcode libraries may require SVG or image output adjustments in React Native.
- Overpass API is a public read-only OSM service with rate limits and reliability constraints. Store discovery must keep small queries, local filtering, visible attribution, and graceful error handling.
- Expo Location permission prompts must be manually checked on iOS 18.0 and Android 11/API 30.
- Expo Maps is currently alpha and is not available in Expo Go. Store map preview QA requires a development/native build.
- Expo Splash Screen config and assets are native build inputs. Expo Web, Expo Go, and development-client startup are not final proof of production splash behavior; verify launch-screen changes with iOS and Android native preview or production-style cold launches.
- Android store map preview requires a restricted Google Maps Android API key supplied as `GOOGLE_MAPS_ANDROID_API_KEY` before native build. The key must enable Maps SDK for Android and be restricted to package `com.anonymous.loyaltycardwallet` plus the active signing-key SHA-1.
