# LCW-64 Phase 2 QA Evidence

## Scope

- Jira Story `LCW-64`
- Phase 2 subtasks `LCW-71` through `LCW-74`
- Encrypted backup container, backup/restore experience, biometric access control, and redacted local diagnostics

## Automated Verification

Run on 2026-06-24:

| Check | Result |
| --- | --- |
| `npx expo install --check` | Passed; dependencies are aligned with Expo SDK 56. |
| `npx expo-doctor` | Passed 18/18 checks. |
| `npm run typecheck` | Passed. |
| `npm run lint` | Passed after removing one unused callback warning. |
| `npm test` | Passed 100 tests. |
| Expo Web root | HTTP 200, 1,292 bytes. |
| Expo Web development bundle | HTTP 200, 8,377,544 bytes; contains the encrypted-backup Account UI. |

## Focused Coverage

- Golden vectors: envelope v1 with encrypted payload v1 and payload v2.
- Lazy export-source consumption verifies record backpressure before card/image loading.
- Correct passphrase, wrong passphrase, tampered record, truncated file, future envelope, future payload, and payload-v1 migration.
- Provider cancellation, low storage, partial-output abort/cleanup, oversized image/wallet, and no restore writes after authentication failure.
- JPEG/PNG/WebP header contract with MIME and dimension mismatch rejection.
- AccessGate enabled launch, resume before/after timeout, cancel, lockout, and locked deep-link state.
- Diagnostics redaction for card numbers, image bytes, passphrases, keys, precise coordinates, and platform errors.
- Existing legacy plaintext v1 import/export, selected-card share links, duplicate handling, private images, Cards organization, barcode/checkout, scanner, stores, SQLite migrations, and transaction tests.

## iOS 18.0 Evidence

- Target: installed iOS 18.0 iPhone 16 Pro simulator.
- `npx expo run:ios --device 06D7E917-740A-4ED2-B13B-3389456F8DAA --no-bundler`
  built successfully with 0 errors and 2 unrelated existing warnings.
- Native compilation included Expo Crypto, Document Picker, File System, Sharing, and Local Authentication.
- The app installed, launched through `simctl`, loaded the 3,298-module native development bundle, and rendered the Cards screen.
- Expo CLI's final simulator-window activation failed because macOS rejected an `osascript` process query. Direct `simctl` launch succeeded, so this is a host UI-automation limitation rather than a build or app-launch failure.

## Native Gaps

- Interactive iOS system share/document-provider save and restore selection were not completed because the Maestro CLI is unavailable and the host blocked Expo's AppleScript window activation.
- Interactive Face ID/Touch ID success, cancel, lockout, and device-credential fallback were not completed. The native module compiles; the pure AccessGate state machine and typed error mapping are automated.
- Android tooling is installed, but no Android 11/API 30 AVD is present. Available AVDs are API 35/36, and no Android device is attached. Android API 30 provider and BiometricPrompt checks remain open.
- Native share sheets do not consistently report whether the user saved the file after presentation. The adapter treats successful sheet presentation as completion and always removes the temporary cache file afterward.
- Privacy-safe Maestro Account smoke flows now exist, but provider and biometric prompts remain explicit manual procedures and were not executed.

## Data And Privacy Findings

- SQLite schema remains version 3.
- Local-security settings use existing `app_metadata`; no migration was added.
- Selected-card sharing remains in `SharingService`.
- Full-wallet recovery uses a separate `BackupService`.
- Diagnostics remain in a bounded in-memory buffer with redaction before insertion and no automatic telemetry.
- Biometric app lock is documented as an access-control layer, not SQLite-at-rest encryption.

## Release Assessment

Automated contracts, web smoke, iOS 18.0 native compilation, installation, and runtime bundling pass. Phase 2 is implementation-complete with explicit native interaction gaps for iOS provider/authentication prompts and Android API 30.

Release-hardening status on 2026-06-25 remains open; see `docs/qa/lcw-64-release-hardening.md`.
