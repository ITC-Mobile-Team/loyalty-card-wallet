# LCW-64 Release Hardening And Evidence

## Status

`BLOCKED`

Release reproducibility and executable decoder evidence improved on 2026-06-25, but required native device, provider, signing, performance, remote CI, and Jira evidence is still unavailable.

## Scope And Design Control

- Module order: developer tooling, scanner/import QA, native automation, release evidence.
- Design scope: HOLD DESIGN.
- No product feature, navigation, layout, motion, shared UI primitive, schema, or no-go decision changed.
- New dependencies:
  - `expo-system-ui` is the Expo SDK 56-compatible runtime package required to honor the existing Android dark `userInterfaceStyle` contract;
  - `bwip-js` and `pngjs` are development-only fixture generators;
  - Maestro remains an external CLI and is not installed into the app or npm dependency graph.

## Reproducible Environment

- Node contract: 22.23.1 in `.nvmrc`, `.node-version`, and `package.json`.
- Aggregate command: `npm run verify`.
- CI now uses `.nvmrc` and the same aggregate command.
- Aggregate coverage:
  - `npx expo install --check`;
  - `npx expo-doctor`;
  - `npm run typecheck`;
  - `npm run lint`;
  - `npm test`;
  - `npx expo prebuild --no-install`;
  - `npm run verify:native-surfaces`.

iOS uses `userInterfaceStyle: "automatic"` because Expo requires automatic appearance when a dark splash variant is configured; both approved splash variants use the same dark background and image. Android remains `dark` through `expo-system-ui`. This resolves both prebuild warnings without changing the visible design.

## Final Local Verification

Executed with Node 22.23.1 on 2026-06-25:

```sh
npm ci
npm run verify
npm run verify:barcode-corpus:ios
```

Results:

- clean install completed with 864 packages;
- Expo dependency alignment passed;
- Expo Doctor passed 21 of 21 checks;
- TypeScript and ESLint passed;
- 136 of 136 tests passed;
- Expo prebuild completed without the previous appearance warnings;
- generated native-surface inspection passed;
- Apple Vision corpus verification passed all thresholds.

Web smoke:

- root HTML returned HTTP 200 and 1,292 bytes;
- Expo Router development bundle returned HTTP 200 and 8,455,281 bytes;
- the rendered shell contained Cards, Stores, and Account;
- headless Chrome reported no console errors or page errors.

Native compile gates:

- Android `:app:assembleDebug` passed with `minSdk 30`;
- unsigned iOS generic simulator build passed and embedded the WidgetKit extension;
- the generated widget extension now derives `MARKETING_VERSION` from the Expo app version;
- a regenerated iOS build passed without the previous widget/app short-version mismatch warning.

## Executable Barcode Corpus

Command:

```sh
npm run fixtures:barcodes
npm run verify:barcode-corpus:ios
```

Host evidence on 2026-06-25:

- decoder: Apple Vision through the same `VisionBarcodeDecoder.swift` implementation used by the iOS Expo module;
- fixtures: 52 privacy-safe PNGs;
- positive fixtures per format: 6;
- transformations: rotation, scale, low contrast, blur, and glare;
- negatives: unreadable blank/noise/crop and invalid EAN-13 checksum;
- false positives: 0.

| Format | Recall | Precision |
| --- | ---: | ---: |
| Code 128 | 100% | 100% |
| Code 39 | 100% | 100% |
| EAN-13 | 100% | 100% |
| EAN-8 | 100% | 100% |
| UPC-A | 100% | 100% |
| UPC-E | 100% | 100% |
| ITF | 100% | 100% |
| QR | 100% | 100% |

This closes the iOS Apple Vision corpus threshold for the committed synthetic fixtures. Android uses Expo Camera decoding and still requires execution on Android 11/API 30 before cross-platform decoder acceptance can close.

## Native Automation

Privacy-safe Maestro flows now cover:

- iOS and Android app-shell/Account smoke;
- iOS and Android location denial with Cards fallback;
- iOS and Android widget fallback deep links;
- real-image bulk-import draft creation and process-death resume.

Maestro was not installed on the host, so no flow execution is claimed. The exact commands and manual boundaries are in `docs/qa/native-journey-automation.md`.

## Audit Advisory Disposition

`npm audit --json` reported 12 moderate advisories and no low, high, or critical advisories.

The chain is in Expo CLI/config/prebuild tooling and its `xcode` → `uuid` dependency. npm proposes Expo 46.0.21, `expo-sharing` 14.0.8, or `expo-splash-screen` 55.0.22 as automatic fixes. Those versions are incompatible downgrades from Expo SDK 56 and would break the current React Native/Expo contract.

Disposition:

- do not run `npm audit fix --force`;
- keep Expo SDK packages aligned through `npx expo install --check` and Expo Doctor;
- review upstream Expo releases for a compatible advisory fix;
- reassess before release if severity, exploitability, or runtime exposure changes.

## Git And Remote Evidence

- Working tree: complete Phase 1 through Phase 4 implementation remains uncommitted on `main` above `origin/main`.
- Git mutation authorization: not provided.
- Branch/commit/push/PR: not performed.
- Remote CI for this exact tree: unavailable and not claimed.

## Native Matrix

| Area | iOS 18.0 | Android 11/API 30 |
| --- | --- | --- |
| Native compile | Passed: unsigned generic iOS simulator build | Passed: Android debug APK compile; API 30 runtime still open |
| Executable image decoder corpus | Passed on macOS Apple Vision implementation; in-app picker matrix still open | Open |
| 50-image picker/cancel/terminate/resume/selective commit | Open | Open |
| Native backup providers and failure matrix | Open | Open |
| Biometrics and sensitive export reauthentication | Open | Open |
| Signed widget placement/reload/revoke/tap | Blocked by App Group/provisioning | Blocked by missing API 30 target |
| Widget locked cold/warm deep links | Open | Open |
| Widget p50/p95 | Unmeasured | Unmeasured |
| Nearby accepted interaction matrix | Open | Open |

## Remaining Blockers

- Maestro CLI unavailable.
- No Android API 30 AVD or attached Android device.
- Apple App Group and extension provisioning unavailable.
- No physical target for widget-to-barcode performance.
- Native provider and biometric interaction matrices not executed.
- Interactive iOS 50-image and nearby matrices not executed.
- Search/sort performance not measured on the documented API 30 low-memory target.
- No Git mutation authority, remote CI evidence, PR, or Jira mutation tool.

## Closure Recommendation

Do not close LCW-64. Phase 1 iOS synthetic decoder quality is evidenced, but every phase still has at least one original native acceptance gate without evidence or an owner-approved waiver.
