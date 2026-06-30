# LCW-64 Phase 3 QA Evidence

## Scope

Jira Story LCW-64, Phase 3 subtasks LCW-75 through LCW-78:

- external snapshot foundation;
- iOS and Android phone-widget foundations;
- Apple Wallet and Google Wallet feasibility;
- Apple Watch and Wear OS feasibility.

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
  110 passed, 0 failed
```

Phase 3 automated coverage includes:

- snapshot envelope v1/payload v1 golden fixture;
- deterministic source-ID ordering and projection;
- explicit opt-in and absence of non-selected cards;
- minimum-field enforcement and rejection of unknown/sensitive fields;
- document and entry revision updates;
- synchronization and revocation tombstones;
- repository-wide update/delete synchronization covering UI, import, and restore mutation paths;
- missing, stale, future envelope/payload, corrupt, revoked, and not-selected outcomes;
- in-memory and native-wrapper shared-storage contract suites;
- selected-card scan-mode and safe Cards fallback deep links;
- locked widget deep-link AccessGate behavior;
- existing encrypted backup, legacy sharing/import, duplicate, image, Cards organization, scanner, barcode, checkout, store, and migration regression tests.

## Generated Native Verification

Commands:

```text
npx expo prebuild --no-install
npm run verify:native-surfaces
```

Result:

- generated `LoyaltyCardWidget` WidgetKit extension target;
- generated widget bundle identifier `com.anonymous.loyalty-card-wallet.widget`;
- generated App Group entitlement input `group.com.anonymous.loyalty-card-wallet`;
- generated Android `LoyaltyCardWidgetProvider`, manifest receiver, layout, metadata, colors, and strings;
- generated-source inspection passed.

Native compile checks:

```text
cd ios
pod install
xcodebuild -workspace LoyaltyCardWallet.xcworkspace \
  -scheme LoyaltyCardWallet \
  -configuration Debug \
  -sdk iphonesimulator \
  -destination 'generic/platform=iOS Simulator' \
  CODE_SIGNING_ALLOWED=NO \
  build
  BUILD SUCCEEDED

cd android
./gradlew :app:assembleDebug
  BUILD SUCCESSFUL
```

The iOS build compiled and embedded the WidgetKit extension. The Android build compiled the local Expo storage module and AppWidget provider with `minSdk 30`.

## Web Smoke

`CI=1 npm run start:web -- --port 8081`:

- root HTML returned HTTP 200;
- Expo Router bundle returned HTTP 200 and 8,403,406 bytes;
- bundle contained the Cards shell and optional external snapshot native-module fallback;
- native widget configuration remains unsupported on web without crashing the app shell.

## Feasibility Decisions

- iOS Home Screen widget: GO foundation; signed device evidence still required.
- Android Home Screen widget: GO foundation; API 30 emulator/device evidence still required.
- Apple Wallet: NO-GO for arbitrary cards without issuer ownership and protected signing infrastructure.
- Google Wallet: NO-GO without issuer account, publishing approval, secure issuance, and program ownership.
- Apple Watch: NO-GO for Phase 3 shipping; reconsider after signed phone-widget evidence.
- Wear OS: NO-GO for Phase 3 shipping; reconsider after API 30 phone-widget evidence.

## Exact Remaining Gaps

- No Apple Developer App Group or extension provisioning profile was available, so signed iOS 18.0 widget installation, gallery placement, reload, and tap behavior were not proven.
- No Android 11/API 30 AVD or attached Android device was available, so launcher widget placement, resize, reload, and tap behavior were not proven.
- No real iPhone/Android phone widget-to-barcode sample matrix was available. Required p50 under 2 seconds and p95 under 3 seconds remain unmeasured.
- Real-device locked cold/warm widget deep-link behavior remains manual QA; the root AccessGate policy is covered by automated state tests.
- Apple Wallet/Google Wallet issuer credentials, backend signing, publishing approval, and merchant authorization were intentionally not created.
- Apple Watch/Wear OS targets, signing, simulators, and hardware were intentionally not added after their no-go decisions.
- Maestro fallback deep-link flows now exist for iOS and Android, but the CLI was unavailable and no execution is claimed.

## Data Safety Result

The committed snapshot fixture and tests prove that external storage excludes:

- card notes;
- private image bytes and image references;
- diagnostics;
- passphrases and encryption keys;
- precise coordinates;
- backup records;
- non-selected cards.

SQLite schema remains version 3, and neither widget reads or shares the primary database.

Release-hardening status on 2026-06-25 remains blocked by signing, API 30 runtime, locked deep-link, and performance evidence; see `docs/qa/lcw-64-release-hardening.md`.
