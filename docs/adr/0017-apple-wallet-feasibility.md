# ADR 0017: Apple Wallet Feasibility

## Status

Accepted — NO-GO for arbitrary local loyalty-card export.

## Date

2026-06-25

## Context

Apple Wallet passes are issuer-controlled signed packages. Apple requires a Pass Type ID and signing certificate, and pass updates add web-service and push-notification operational ownership. This app stores arbitrary user-entered cards for merchants it does not represent.

## Decision

Do not implement Apple Wallet export for arbitrary stored cards.

A future GO requires all of the following:

- an issuer relationship or clear legal right to issue the pass;
- an Apple Pass Type ID and certificate owned outside the client app;
- server-side or otherwise protected pass signing;
- policy, branding, privacy, certificate-rotation, revocation, and update ownership;
- native-device and App Review validation.

Private keys, certificates, or issuer credentials must never be embedded in the app.

## Rationale

The local-only app cannot safely sign passes without distributing issuer secrets. Issuing generic passes for third-party loyalty programs would also create ownership, branding, update, and support obligations that are outside the product scope.

## Consequences

- Apple Wallet is not a Phase 3 shipping surface.
- Widgets remain the supported fast-access system surface on iOS.
- A merchant-partner or first-party program can reopen this decision with a backend and issuer ownership.

## Alternatives Considered

- Embed a PassKit certificate/private key: rejected as a critical secret-exposure design.
- Sign arbitrary passes on device under the app's identity: rejected because users' third-party cards are not programs issued by this app.
- Add a backend only for signing: rejected for the current local-first pet-project scope and ongoing credential/availability burden.

## References

- https://developer.apple.com/wallet/get-started/
- https://developer.apple.com/documentation/passkit
