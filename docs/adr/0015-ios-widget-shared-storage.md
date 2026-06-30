# ADR 0015: iOS Widget Shared Storage

## Status

Accepted — GO for implementation; shipping still requires signed native-device evidence.

## Date

2026-06-25

## Context

WidgetKit extensions run outside the main app process and cannot query the app's private SQLite database. Apple documents App Groups as the shared-container mechanism for app and widget data. The repository uses Expo Continuous Native Generation, so the extension target and entitlements must be reproducible rather than maintained as ignored native-project edits.

## Decision

- Generate a WidgetKit extension target through a committed Expo config plugin.
- Add the same App Group entitlement to the main app and widget extension.
- Write the external snapshot atomically to the App Group container through a local Expo module.
- Have WidgetKit read and validate only the external snapshot contract.
- Show active minimum card data and deep-link to scan mode.
- Show a safe `Open Wallet` fallback for missing, stale, revoked, future-version, or corrupt data.
- Request timeline reload after writes or revocations.
- Do not assume the extension can present LocalAuth prompts.
- Do not declare the widget shippable until generated-target inspection, signing, simulator/device behavior, and widget-to-barcode timing are recorded.

## Rationale

App Groups are the native shared-storage boundary intended for an app and its extensions. A config plugin keeps target generation, bundle identifiers, entitlements, source files, and build settings reproducible under Expo prebuild.

## Consequences

- The Apple Developer team must provision the App Group and extension bundle identifier.
- Widget signing can fail until those capabilities exist in the selected developer account.
- Lock Screen widgets remain deferred until the Home Screen path has native evidence.
- The ignored `ios/` directory is generated verification output, not the source of truth.

## Alternatives Considered

- Manual Xcode target edits: rejected because prebuild can overwrite them.
- SQLite in the App Group: rejected by the external-snapshot privacy boundary.
- `UserDefaults.standard`: rejected because it is not shared with the extension.
- A third-party widget runtime dependency: deferred because the minimum native target is small and the project requires direct snapshot validation.
