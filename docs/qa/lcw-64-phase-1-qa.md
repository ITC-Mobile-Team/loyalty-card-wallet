# LCW-64 Phase 1 QA

## Scope

Jira `LCW-65` through `LCW-70`: barcode capability policy, resumable bulk import, card organization queries, Ukraine-first catalog, and Cards organization UI.

## Automated Evidence

Run on 2026-06-24:

- `npx expo install --check`: passed.
- `npx expo-doctor`: 18/18 checks passed.
- `npm run typecheck`: passed.
- `npm run lint`: passed.
- `npm test`: 84 tests passed.
- Synthetic 50-item mixed import session: passed.
- Synthetic 1,000-card query benchmark: below the 100 ms test budget.
- Web document and JavaScript bundle endpoints: HTTP 200.

Release-hardening evidence on 2026-06-25:

- Replaced the metadata-only corpus with 52 generated privacy-safe PNG fixtures.
- `npm run verify:barcode-corpus:ios`: passed against the Apple Vision implementation used by the iOS Expo module.
- Code 128, Code 39, EAN-13, EAN-8, UPC-A, UPC-E, ITF, and QR each measured 100% recall and 100% precision across six positive fixtures per format.
- Unreadable blank/noise/crop and invalid EAN-13 checksum fixtures produced no false positives.
- Added Maestro flows that seed the 50-image journey and automate one real-image decode plus process-termination resume.

## Runtime Evidence

- Expo Web rendered Cards search/filters, scanner actions, bulk-import empty state, multilingual catalog filtering, catalog-to-manual prefill, card creation, and Card Detail.
- iOS simulator native build succeeded with zero errors and one existing duplicate-library warning.
- The migrated SQLite-backed Cards screen launched on the iOS simulator.

## Recorded Gaps

- Maestro is not installed in the current environment, so the committed native flows were not executed.
- No Android emulator or device was attached, so Android 11/API 30 runtime verification remains required.
- iOS source-photo selection, app termination during an active session, and resumed review still require interactive native QA with synthetic images.
- Query timing on the documented low-end Android target still requires device evidence; the current benchmark covers pure repository behavior.
- Android Expo Camera decoder recall/precision remains unmeasured on API 30.

## Manual Follow-Up

1. Regenerate the fixtures with `npm run fixtures:barcodes` and add the `journey50` files from `test/fixtures/barcodes/manifest.json` to the target photo library.
2. Import a mix of supported, ITF, QR, duplicate, unreadable, rotated, blurred, low-contrast, and multi-barcode images.
3. Terminate the app after drafts appear, relaunch, and confirm normalized drafts resume without source images.
4. Correct merchant names and formats, then save ready drafts with and without duplicates.
5. Verify search, favorite, recent/alphabetical sorting, archive, restore, filtered empty states, and one-tap Card Detail access.
6. Repeat on iOS 18.0 and Android 11/API 30.

Detailed release-hardening evidence and the native procedure are in `docs/qa/lcw-64-release-hardening.md` and `docs/qa/native-journey-automation.md`.
