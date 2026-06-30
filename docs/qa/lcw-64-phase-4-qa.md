# LCW-64 Phase 4 QA Evidence

## Scope

Jira Story LCW-64, Phase 4 subtasks LCW-79 and LCW-80:

- explicit foreground `Near Me` orchestration;
- conservative nearby loyalty-card suggestions;
- stable local card merchant identities;
- user-owned merchant/store links;
- confirmation, correction, dismissal, disable/re-enable, removal, and stale-source repair;
- schema version 3 to 4 migration;
- release-verification handoff.

## Automated Verification

Run on 2026-06-25:

```text
npx expo install --check
  Dependencies are up to date

npx expo-doctor
  18/18 checks passed

npm run typecheck
  passed

npm run lint
  passed

npm test
  136 passed, 0 failed
```

Phase 4 automated coverage includes:

- Unicode-aware merchant normalization and stable local keys;
- confirmed-link create/read, disable, re-enable, repair, and remove behavior;
- confirmed-link correction from the existing link ID while preserving OSM evidence;
- optional OSM source/type/id preservation;
- stale-reference repair without changing the merchant association;
- direct batched OSM source-ID verification; absence from a bounded nearby response is explicitly not treated as stale;
- supplementary OSM verification failure does not create a stale claim or block ordinary candidates;
- persisted dismissal and explicit confirmation clearing;
- ambiguity and no-match behavior without persistence;
- labeled matching fixtures at 100% measured precision for accepted fixtures, exceeding the 90% requirement;
- permission denied, unavailable location, network failure, no nearby stores, cancellation, and storage failure typed outcomes;
- one explicit foreground location request and one origin request per workflow call;
- no current-coordinate retention in workflow results;
- no coordinate-derived nearby origin cache;
- real SQLite merchant-link repository contract coverage;
- real SQLite v3-to-v4 preservation coverage for cards, images, import sessions/drafts, catalog overrides, and app metadata;
- real SQLite migration-failure rollback coverage with schema version and existing card data preserved;
- existing organization, scanner, barcode/checkout, images, sharing, encrypted backup, AccessGate, diagnostics, and external snapshot/widget regression tests.

## Web Smoke

`CI=1 npm run start:web -- --port 8081`:

- root HTML returned HTTP 200;
- Expo Router bundle returned HTTP 200;
- bundle size after the completed follow-up: 8,454,795 bytes;
- bundle contained `Near Me`, `Nearby Card Suggestions`, `Merchant Links`, and location fallback copy;
- headless browser interaction loaded 95 live Kyiv OSM stores;
- tapping `Near Me` in the headless web context returned the explicit location-denied fallback, retained city results, and did not show a misleading no-suggestion state;
- native foreground location remains a platform behavior and may report unavailable/unsupported on web without breaking the app.

## iOS 18.0 Evidence

Target: booted iPhone 16 Pro simulator on iOS 18.0.

- Native build succeeded.
- Widget extension compiled and embedded as part of the existing generated native project.
- App installed and launched with bundle identifier `com.anonymous.loyalty-card-wallet`.
- Simulator location was set to a synthetic Kyiv coordinate for the intended foreground test.
- The app shell rendered on the simulator.

Interactive gap:

- Expo completed build/install/launch, then host `System Events` automation returned a non-zero error while activating Simulator.
- The development-client open confirmation remained on screen and no available local UI automation tool could press through it.
- Therefore `Near Me`, foreground allow/deny prompts, live Overpass lookup, confirm/correct/dismiss/disable/re-enable/remove/repair, and offline/error interaction checks were not claimed as passed.

## Android 11/API 30 Evidence

- No Android 11/API 30 AVD was installed.
- No Android device was attached.
- Available AVDs target API 35/36 or Android 15 and do not satisfy the minimum-target evidence requirement.
- Android API 30 foreground permission and interaction checks remain open.

## Release-Hardening Automation

Privacy-safe Maestro flows now verify that no location error is shown before `Near Me`, deny foreground location, assert the explicit recovery copy, and return to Cards. The CLI was not installed on the host, so these flows were not executed and do not close the accepted native matrix.

Maestro location injection itself requires Android API 31 or newer. Android API 30 accepted-flow location must therefore be set through emulator controls or `adb emu geo fix`, as documented in `docs/qa/native-journey-automation.md`.

## Privacy And Contract Result

- Nearby lookup is triggered only by the existing `Near Me` action.
- Store text/category filtering is local.
- Nearby origin requests are not cached by current-coordinate key.
- Merchant matching is local and deterministic.
- Card numbers, images, notes, and image references are not included in Overpass queries.
- Confirmed links store a local merchant key and optional repairable OSM evidence.
- External snapshot/widget payload versions and fields are unchanged.
- Background location, geofencing, unsolicited notifications, and coordinate history were not added.

## Administrative Gap

No Jira mutation tool was available in the session. LCW-64, LCW-79, and LCW-80 still require concise remote progress/status updates referencing this evidence and `docs/instructions/phase-handoff-prompts.md`.

## Release Disposition

Phase 4 implementation and automated verification are complete. Final roadmap closure requires the release-verification prompt in `docs/instructions/phase-handoff-prompts.md`, principally the iOS interaction matrix, Android API 30 evidence, inherited Phase 3 signed-widget/device evidence, and Jira updates.

Release-hardening status on 2026-06-25 remains open; see `docs/qa/lcw-64-release-hardening.md`.
