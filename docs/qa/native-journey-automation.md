# Native Journey Automation

## Scope

Maestro flows under `.maestro/` cover repeatable, privacy-safe native checks for the highest-risk Phase 1 through Phase 4 entry points:

- app-shell navigation and Phase 2 Account sections;
- Phase 1 real-image decode plus import-session resume after process termination;
- Phase 3 safe widget fallback deep links;
- Phase 4 location denial without loss of Cards access.

The flows use synthetic fixtures from `test/fixtures/barcodes/`. They do not contain credentials, real loyalty-card images, passphrases, provider accounts, signing material, or private backups.

## Prerequisites

- Node.js 22.23.1 and `npm ci`.
- A native development build installed on the target.
- Maestro CLI installed outside the repository.
- iOS 18.0 simulator/device for iOS flows.
- Android 11/API 30 emulator/device for Android flows.

Generate the fixture corpus before running Phase 1:

```sh
npm run fixtures:barcodes
```

Run platform flows:

```sh
npm run test:native-journeys:ios
npm run test:native-journeys:android
```

Use `--device=<identifier>` with the Maestro command directly when more than one target is connected. Capture reports outside Git unless they contain only reviewed, privacy-safe evidence.

## Automated Boundaries

The Phase 1 flow seeds the full 50-image corpus into the iOS photo library, selects one real fixture through the system picker, verifies that the real native decoder creates a draft, terminates the app, and verifies session resume. The Android flow performs the same decoder/resume contract with API-appropriate picker selectors.

The system photo pickers vary by OS release. The committed flows use current iOS 18 and Android DocumentsUI/Media Provider selectors with optional fallbacks. If selectors drift, update only the automation selectors; do not add product UI solely for test control.

## Required Manual Procedures

### Phase 1: 50-Image Journey

1. Generate the fixtures.
2. Add the 50 files listed in `test/fixtures/barcodes/manifest.json` under `journey50` to the target photo library.
3. Open `Add card` → `Import Multiple Screenshots` → `Choose Screenshots`.
4. Select all 50 in manifest order.
5. Verify supported detections, unreadable-image failure, duplicate values, and blocked ITF/QR drafts.
6. Cancel once and verify no unintended commit.
7. Start again, terminate after drafts are persisted, relaunch, and verify resume.
8. Correct required merchant fields, selectively save valid drafts, skip duplicates, and verify every result remains reported.

### Phase 2: Providers And Biometrics

Run correct/wrong passphrase, provider cancellation, corruption, future version, low storage, cleanup, biometric success/cancel/lockout/fallback/background timeout, and export reauthentication through the native system UI. These prompts depend on device enrollment and provider state and are not treated as passed by the Account smoke flow.

### Phase 3: Widgets

Place, resize where supported, reload, revoke, and tap the signed widget. Verify stale/corrupt/expired/revoked fallbacks and locked cold/warm deep links. Record at least 20 widget-to-rendered-barcode samples per target and calculate p50/p95.

### Phase 4: Accepted Matrix

Run allow and deny permission, nearby lookup, confirm/correct/dismiss/disable/re-enable/remove/repair, ambiguity/no-match, offline/network, cancellation, and storage failure. Maestro `setLocation` requires Android API 31 or newer, so Android API 30 location injection must use emulator controls or `adb emu geo fix`; it remains an explicit platform procedure.

## Evidence Rule

Record the command, target model, OS version, build type, date, result, and artifact path in the relevant tracked QA document. Compilation, flow presence, or synthetic unit coverage does not substitute for a system-provider, signed-widget, biometric, or minimum-device pass.
