# ADR 0020: Wear OS Feasibility

## Status

Accepted — NO-GO for Phase 3 shipping; reconsider after phone-widget release evidence.

## Date

2026-06-25

## Context

Wear OS requires a separate watch application/module, explicit standalone or non-standalone declaration, Data Layer or network synchronization, Play distribution configuration, watch-specific UI, battery behavior, and emulator/hardware QA. No Wear OS emulator or device is available in the current environment.

## Decision

- Do not ship a Wear OS app, tile, widget, or complication in Phase 3.
- Keep the external snapshot contract suitable for bounded Data Layer transfer later.
- Reconsider after the Android API 30 phone widget is stable and measured.
- A future spike must decide standalone status, phone capability detection, Data Layer revision/revocation behavior, offline storage, barcode usefulness, target API, bundle packaging, Play policy, CI, and device coverage.

## Rationale

The current local-first phone app cannot provide credible watch release evidence without a separate application lifecycle and device matrix. Shipping a dependent watch binary before the phone surface is stable would add high maintenance cost without proving checkout value.

## Consequences

- No Wear OS module or dependency is added in Phase 3.
- The phone widget remains the Android system surface.
- A later implementation may transfer the same minimal snapshot payload rather than sharing SQLite.

## Alternatives Considered

- Add a non-standalone watch app now: rejected because installation, capability detection, synchronization, and QA remain separate release work.
- Access phone storage directly: rejected because Wear OS is a separate device and requires explicit transfer.

## References

- https://developer.android.com/training/wearables/apps/standalone-apps
- https://developer.android.com/training/wearables/data/data-layer
