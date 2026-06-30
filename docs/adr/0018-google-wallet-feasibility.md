# ADR 0018: Google Wallet Feasibility

## Status

Accepted — NO-GO without issuer ownership and secure issuance infrastructure.

## Date

2026-06-25

## Context

Google Wallet loyalty passes require a Google Wallet API Issuer account, Passes Classes and Objects, signed JWT issuance, and publishing approval for general users. REST signing uses a sensitive service-account key. Even Android SDK issuance remains tied to an approved issuer identity and application signing configuration.

## Decision

Do not implement Google Wallet export for arbitrary stored cards.

A future GO requires:

- a legitimate issuer account and business profile;
- production publishing approval;
- program/merchant ownership or authorization;
- secure server-side credential and JWT lifecycle where required;
- class/object update, revocation, privacy, policy, branding, and maintenance ownership;
- native production validation.

Service-account keys or equivalent issuer secrets must never be embedded in the app.

## Rationale

The app is not the issuer of arbitrary third-party loyalty programs. A secure and policy-compliant implementation requires operational infrastructure and issuer approval that conflict with the current local-only scope.

## Consequences

- Google Wallet is not a Phase 3 shipping surface.
- Android App Widgets remain the supported fast-access system surface.
- A first-party or merchant-partner program can reopen the decision.

## Alternatives Considered

- Embed a service-account key: rejected as credential exposure.
- Use demo mode for production users: rejected because it is test-only and access restricted.
- Create generic passes under one app-owned issuer: rejected because it misrepresents third-party program ownership and creates policy/maintenance risk.

## References

- https://developers.google.com/wallet/retail/loyalty-cards/getting-started/issuer-onboarding
- https://developers.google.com/wallet/retail/loyalty-cards/use-cases/jwt
- https://developers.google.com/wallet/retail/loyalty-cards/test-and-go-live/request-publishing-access
