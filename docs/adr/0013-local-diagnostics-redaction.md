# ADR 0013: Local Diagnostics Redaction

## Status

Accepted.

## Date

2026-06-24

## Context

Recovery and native-provider failures need inspectable evidence, but diagnostics must not become telemetry or leak wallet secrets. Card numbers, image bytes, backup passphrases, derived keys, precise coordinates, and raw platform errors are sensitive.

## Decision

- Keep diagnostics in a bounded in-memory ring buffer with safe event codes, timestamps, component names, and redacted metadata.
- Do not add automatic upload, analytics, crash reporting, background transfer, or remote storage.
- Apply redaction before an event enters the buffer.
- Remove or replace card-number-like digit sequences, base64/byte payloads, passphrase/key fields, precise coordinates, URI query values, and raw platform error details.
- Export diagnostics only after an explicit user action through the native share surface.
- Cap event count, string length, metadata depth, array length, and final export size.
- Record typed platform and app reason codes instead of native exception messages.

## Rationale

Redaction at ingestion reduces the chance that later rendering or export accidentally exposes a secret. A bounded local buffer is sufficient for user-assisted QA and does not create a telemetry system.

## Consequences

- Some low-level debugging detail is intentionally unavailable.
- Restarting the app clears the diagnostic buffer.
- Exported diagnostics are user-controlled plaintext and must contain only already-redacted data.

## Alternatives Considered

- Console-only logging: rejected because platform errors may leak and users cannot reliably export a bounded report.
- Automatic crash/analytics SDK: rejected because it conflicts with the local-first privacy model.
- Persisted diagnostic database: deferred because persistence increases retention and cleanup risk without a Phase 2 need.
