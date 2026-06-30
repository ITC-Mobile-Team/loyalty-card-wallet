# ADR 0012: Biometric Access Threat Model

## Status

Accepted.

## Date

2026-06-24

## Context

Users may want casual protection against another person opening the wallet on an already unlocked phone. The app must cover launch, background timeout, resume, deep links, cancellation, lockout, and full-wallet export without implying stronger storage protection than it provides.

## Decision

- Add an injected LocalAuthService and a pure AccessGate state machine.
- Keep biometric lock optional and disabled by default.
- Persist only the enabled flag and timeout policy in local app metadata.
- When enabled, require authentication at launch and after the configured background timeout.
- Preserve a pending deep-link route behind the gate; unlocking reveals it, while cancellation or lockout leaves the app locked.
- Require fresh authentication before full-wallet backup export when app lock is enabled.
- Map unavailable hardware, no enrollment, cancellation, failed authentication, temporary lockout, and permanent lockout to typed reasons.
- Do not offer a custom PIN fallback in Phase 2. Platform device-credential fallback may be used where the native prompt supports it.
- Keep backup/restore and local-security failures isolated from Cards, scanner, and checkout after the user is authenticated.
- State explicitly that app lock does not encrypt SQLite or image payloads at rest.

## Rationale

A root state machine makes route and lifecycle behavior testable and prevents feature screens from implementing inconsistent lock policies. Typed reasons keep UI recovery independent from native message strings. Optional local authentication addresses casual access without introducing accounts, secret recovery, or misleading at-rest guarantees.

## Consequences

- Face ID requires a development/native build on iOS; Expo Go is insufficient.
- A compromised or rooted device, debugger, database copy, or malicious OS is outside this control's protection.
- Users who are locked out must recover through the operating system's biometric/device-credential enrollment rather than an app-specific secret.
- Deep links may navigate internally while locked, but protected content is not rendered until unlock.

## Alternatives Considered

- Per-screen biometric prompts: rejected because deep links and lifecycle transitions could bypass inconsistent checks.
- Encrypt SQLite with the biometric key: rejected because it is a different storage architecture and would prevent passphrase-based cross-device recovery.
- Required app PIN: deferred because secure PIN storage, retry policy, and recovery need a separate threat-model decision.
