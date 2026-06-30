# ADR 0016: Android Widget Shared Storage

## Status

Accepted — GO for implementation; shipping still requires API 30 emulator/device evidence.

## Date

2026-06-25

## Context

Android App Widgets run through an `AppWidgetProvider` and `RemoteViews`. The provider shares the application UID and can read app-private files, but it must not query the primary SQLite database or depend on React Native startup.

## Decision

- Generate an `AppWidgetProvider`, widget metadata, layout, strings, colors, and manifest receiver through the committed Expo config plugin.
- Write the external snapshot atomically to an app-private file through the local Expo module.
- Have the provider read and validate only the external snapshot contract.
- Render the first active opted-in card in deterministic source-ID order.
- Deep-link active content to scan mode and every unsafe outcome to the Cards fallback.
- Notify `AppWidgetManager` after snapshot writes or revocations.
- Use APIs available on Android 11/API 30 and avoid Android 12-only widget requirements.
- Do not declare the widget shippable until generated-project inspection and API 30 device/emulator behavior are recorded.

## Rationale

An app-private file is available to both the main app and provider without adding broad storage permissions or exposing SQLite. Traditional `RemoteViews` remains compatible with API 30 and avoids adding a Compose/Glance dependency for one minimal widget.

## Consequences

- The widget is intentionally simple on API 30 and initially displays one selected card.
- Launcher rendering varies and needs device-specific visual/accessibility QA.
- The ignored `android/` directory is generated verification output, not the source of truth.

## Alternatives Considered

- Query SQLite from the provider: rejected by the privacy and migration boundary.
- External/public storage: rejected because it adds permissions and data exposure.
- Jetpack Glance: deferred because it adds dependencies and raises the minimum implementation complexity without improving the first API 30 surface.
