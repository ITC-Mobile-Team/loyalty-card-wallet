# ADR 0019: Apple Watch Feasibility

## Status

Accepted — NO-GO for Phase 3 shipping; reconsider after phone-widget release evidence.

## Date

2026-06-25

## Context

An Apple Watch surface requires a separate watch app or accessory widget/complication target, signing and provisioning, WatchConnectivity or another explicit snapshot transfer path, watch-specific navigation and barcode readability decisions, and watch hardware/simulator QA. The repository has no existing watch target or signed watch-device evidence.

## Decision

- Do not ship an Apple Watch app or complication in Phase 3.
- Keep the external snapshot payload independent of phone widget APIs so it can be transferred later.
- Reconsider only after the iOS phone snapshot/widget path has signed device evidence and measured checkout latency.
- A future spike must separately decide watch app versus accessory widget, transfer/revocation semantics, offline behavior, barcode utility, accessibility, signing, CI, and release ownership.

## Rationale

Adding a watch target now would multiply signing, transfer, build, and QA scope before the phone contract has production evidence. The phone widget already supplies the intended fast path without making the watch a release blocker.

## Consequences

- No Apple Watch binary or entitlement is added in Phase 3.
- The snapshot contract and revocation model remain reusable.
- The decision can change when hardware, signing, and a stable phone baseline are available.

## Alternatives Considered

- Ship a minimal complication immediately: rejected because it still requires a signed watch target and transfer verification.
- Read the phone App Group directly: rejected because watchOS does not share the iPhone app's container as a general synchronization mechanism.

## References

- https://developer.apple.com/documentation/watchconnectivity/transferring-data-with-watch-connectivity
- https://developer.apple.com/documentation/widgetkit/creating-accessory-widgets-and-watch-complications
