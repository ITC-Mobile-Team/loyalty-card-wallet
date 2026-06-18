# ADR 0007: Store Map Preview Dependencies

## Status

Accepted.

## Date

2026-06-17

## Context

Store detail screens now receive OpenStreetMap coordinates from the existing `StoreSummary` data shape. Users can inspect latitude and longitude, but raw coordinates are not enough for quick orientation. The app should show a small embedded map preview on the store detail screen and provide actions to open the coordinate in the user's maps app and copy the coordinate string.

The app is Expo + React Native, targets iOS 18.0 and Android 11/API 30, and already uses Expo-managed native modules. New map dependencies affect native builds, Android API key setup, app size, and manual QA.

## Decision

Use Expo-managed dependencies for store map preview and coordinate copying:

- `expo-maps` for the embedded map preview.
- `expo-clipboard` for `Copy Coordinates`.
- React Native `Linking` for `Open in Maps`.

`expo-maps` renders Apple Maps on iOS and Google Maps on Android. The store detail map preview will be read-only and centered on the store coordinate with one marker. It will not request user location or show the user's current position.

The app will not hardcode Google Maps API keys. Android map configuration must use a restricted Google Maps Android API key supplied through build-time environment configuration.

Implementation uses `GOOGLE_MAPS_ANDROID_API_KEY` in `app.config.js` to populate `android.config.googleMaps.apiKey`. The runtime receives only a boolean configured/unconfigured flag so Android can show fallback text instead of attempting to render a known-unconfigured map.

## Rationale

- Expo Maps is the Expo-owned maps package for the current SDK line and matches the app's existing dependency strategy.
- The current iOS minimum is iOS 18.0, which matches the iOS floor for Expo Maps event APIs and the app's existing platform target.
- A small read-only preview solves the user need without introducing route planning, map search, geocoding, offline tiles, or a new backend.
- Opening the native maps app through `Linking` is reversible and works even if the embedded preview cannot render.
- `expo-clipboard` is an Expo-owned package and avoids unsupported React Native core clipboard APIs.

## Consequences

- Expo Maps is currently alpha and not available in Expo Go; QA must use development/native builds.
- Android requires Google Maps SDK setup and a restricted API key before map rendering can be verified.
- The app must keep a non-map fallback for missing coordinates, unsupported platforms, and map load failures.
- Web smoke tests should not depend on embedded map rendering.
- Native builds must be verified after dependency installation and config changes.
- Changing `GOOGLE_MAPS_ANDROID_API_KEY` requires a new Android native build; Metro reload alone cannot update native map metadata.

## Alternatives Considered

- `react-native-maps`: more established and supports Google Maps on iOS, but requires more provider/API-key configuration and is a larger dependency decision than this MVP slice needs.
- `Open in Maps` only: smallest dependency footprint, but it does not satisfy the requested embedded preview.
- Static map image URLs: avoids native map views but introduces remote tile/image requests, provider terms, URL signing/API keys, and image loading failure modes.
- Custom OSM web view: avoids Google Maps keys but adds web view behavior, tile attribution complexity, and offline/runtime reliability concerns.

## Verification Requirements

- `npx expo install --check`
- `npx expo-doctor`
- `npm run typecheck`
- `npm run lint`
- `npm test`
- iOS simulator or device build with the store detail map visible.
- Android emulator/device build with a configured Google Maps Android API key and the store detail map visible.
- Manual checks for missing coordinates, `Open in Maps`, and `Copy Coordinates`.
