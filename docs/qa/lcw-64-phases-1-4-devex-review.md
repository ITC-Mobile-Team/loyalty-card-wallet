# LCW-64 Phases 1-4 Developer Experience And Acceptance Review

## Review Date

2026-06-25

## Scope

Audit the implemented Phase 1 through Phase 4 work against:

- `docs/plans/0021-competitive-parity-roadmap.md`;
- the four phase QA evidence documents;
- the repository onboarding, verification, CI, source, and test contracts;
- a clean dependency installation and live Expo Web smoke run.

This was a review-only pass. No product code or approved design behavior was changed.

## Executive Result

The implementation is architecturally coherent and has strong automated domain/data coverage. It is not accurate to call all four phases closed.

- Phase 1: feature-complete, acceptance open.
- Phase 2: feature-complete, acceptance open.
- Phase 3: platform foundation complete, shipping proof open.
- Phase 4: feature-complete, acceptance open.

The next phase should be release hardening and evidence, not another product feature phase.

## Live Evidence

### Installation And Baseline

- `npm ci --ignore-scripts`: passed in 11.09 seconds.
- Local Node version: 23.11.0.
- Install output: extensive React Native/Metro `EBADENGINE` warnings because Node 23 is unsupported.
- `npx expo install --check`: passed.
- `npx expo-doctor`: passed 18/18.
- `npm run typecheck`: passed.
- `npm run lint`: passed.
- `npm test`: passed, 136 tests.
- Test output includes Node's experimental `node:sqlite` warning.

### Web Smoke

- Expo Web root returned HTTP 200.
- Time from navigation to network idle: 1.677 seconds on the review host.
- Browser console errors: none.
- Cards empty state rendered.
- Phase 1 entry `Import Multiple Screenshots` was reachable from Add Card.
- Phase 2 backup, local security, diagnostics, and maintenance sections rendered.
- Phase 4 Stores loaded 95 live Kyiv OpenStreetMap results.

Screenshots captured during the review:

- `/tmp/lcw-devex-home.png`
- `/tmp/lcw-devex-add.png`
- `/tmp/lcw-devex-account.png`
- `/tmp/lcw-devex-stores-loaded.png`

The gstack browse binary could not start because its expected Playwright Chromium revision was missing. The review used the already-installed Chromium revision through direct Playwright without installing or changing host tools.

### Native Generation

- `npx expo prebuild --no-install`: passed.
- `npm run verify:native-surfaces`: passed.
- Expo reported two warnings:
  - iOS `userInterfaceStyle` may prevent splash-screen behavior from working correctly.
  - Android `userInterfaceStyle` requires `expo-system-ui`.

## Phase Assessment

### Phase 1: Bulk Migration, Organization, And Catalog

Implemented:

- bulk import workflow and persisted resumable drafts;
- capability registry and blocked unrenderable formats;
- organization queries, favorites, archive, search, sorting, catalog, and overrides;
- a synthetic 50-item workflow test;
- a 1,000-card in-memory query benchmark.

Open against the original done criteria:

- The barcode corpus is a TypeScript metadata manifest, not executable image fixtures decoded by the real photo decoder.
- No measured decoder recall/precision evidence proves the required 95% recall and 99% precision.
- The 50-item automated test begins with prepared scan outcomes; it does not exercise picker, decoder, app termination, and resume.
- The 100 ms budget is not measured on the documented Android API 30 low-memory target.

Disposition: feature-complete, acceptance open.

### Phase 2: Recovery, Security, And Diagnostics

Implemented:

- streamed logical backup records;
- PBKDF2-HMAC-SHA256 and AES-256-GCM authenticated encryption;
- golden envelope/payload vectors;
- wrong-passphrase, tamper, truncation, future-version, provider, cleanup, and size-limit coverage;
- image header/MIME/dimension validation;
- AccessGate state machine and redacted bounded diagnostics.

Open against the original done criteria:

- iOS document-provider and biometric interaction matrices are incomplete.
- Android API 30 provider and biometric interaction matrices are incomplete.
- Native low-storage/cancel behavior is contract-tested but not proven through the system providers on both targets.

Disposition: feature-complete, acceptance open.

### Phase 3: Platform Access

Implemented:

- minimal versioned external snapshots;
- explicit per-card opt-in and revocation;
- iOS WidgetKit and Android AppWidget generation;
- generated-native inspection in the local CI definition;
- simulator/debug compilation evidence;
- explicit no-go decisions for system wallets and watches.

Open against the original done criteria:

- no signed iOS widget placement/tap evidence;
- no Android API 30 launcher widget placement/tap evidence;
- no real-device p50/p95 widget-to-barcode measurements;
- no real-device locked deep-link journey;
- the changed CI workflow has not run remotely for the uncommitted Phase 1-4 tree.

Disposition: foundation-complete, not yet proven shippable.

### Phase 4: Foreground Nearby Suggestions

Implemented:

- explicit foreground location orchestration;
- conservative matching and user-owned merchant links;
- confirm, correct, dismiss, disable, re-enable, remove, and repair operations;
- direct batched OSM source verification;
- no coordinate-history result retention;
- real SQLite repository and v3-to-v4 migration/rollback coverage;
- web live-service smoke without console errors.

Open against the original done criteria:

- interactive iOS permission and link-management matrix remains incomplete;
- Android API 30 permission and link-management matrix remains incomplete;
- the matching fixture set is small and synthetic, although its measured accepted precision is 100%.

Disposition: feature-complete, acceptance open.

## Developer Experience Scorecard

| Dimension | Score | Evidence |
|---|---:|---|
| Getting Started | 7/10 | Root README has a clear golden path; clean install is fast; no enforced Node version or aggregate verify command |
| API / CLI / Internal Contracts | 8/10 | Stable scripts, typed ports, clean dependency injection, and structured errors; verification remains multi-command |
| Error Messages And Debugging | 7/10 | Product errors are typed and recovery-oriented; install/audit/prebuild warnings are noisy or misleading without one canonical explanation |
| Documentation And Learning | 6/10 | Documentation is extensive, but core roadmap, handoff, and DX docs are Git-ignored and the prior 9/10 claim is not supported by current evidence |
| Upgrade And Migration Path | 7/10 | Strong forward migration and compatibility tests; no tracked changelog/version policy or dependency-update runbook |
| Developer Environment And Tooling | 6/10 | Fast tests and useful web smoke; no Node pin, native journey automation, API 30 environment, or remote CI evidence for the current tree |
| Community And Ecosystem | 3/10 | No tracked contributing guide, issue templates, security policy, or contributor support surface; lower priority for a private pet project |
| DX Measurement | 4/10 | Some timing budgets and QA logs exist, but no repeatable DX baseline, trend, or native acceptance dashboard |
| **Overall** | **6.0/10** | Strong code-level DX, weak release reproducibility and native acceptance closure |

## Boomerang Comparison

The previous DX remediation targeted at least 8.5/10 and the local DX index later claimed 9/10. The live Phase 1-4 audit scores 6.0/10.

The regression is primarily scope-driven:

- the project now includes crypto, native providers, widgets, native modules, and foreground location;
- the original web/typecheck/lint/test onboarding path still works;
- the expanded native acceptance and release workflow did not gain equivalent automation, environment pinning, and tracked contributor guidance.

The public GitHub repository still shows four commits on `main`, zero open issues, and no pull requests. This independently confirms that the local Phase 1-4 working tree has not entered a reviewable remote workflow.

## Required Corrections

### P0: Release Reproducibility

1. Put the entire Phase 1-4 implementation on a reviewable branch and commit.
2. Run remote CI for that exact commit.
3. Ensure the native-surface generation check is included and green remotely.

### P1: Acceptance Evidence

1. Add Maestro or an equivalent repeatable native journey harness.
2. Complete iOS 18.0 and Android API 30 matrices for bulk import, provider/auth, widgets, and nearby suggestions.
3. Collect signed-widget and widget-to-barcode performance evidence.
4. Replace manifest-only barcode coverage with executable decoder fixtures and measured recall/precision.

### P1: Environment Contract

1. Add a tracked Node version file for a supported Node 22 release.
2. Add one aggregate verification script that runs Expo checks, typecheck, lint, tests, and native-surface inspection.
3. Document that `npm audit fix --force` must not be used to downgrade Expo; review the current Expo/prebuild advisories as upstream/toolchain findings.
4. Resolve or explicitly disposition the `expo prebuild` `userInterfaceStyle` warnings.

### P2: Documentation And Measurement

1. Decide which DX/release instructions must be tracked for contributors and CI versus intentionally local/private.
2. Keep tracked QA evidence self-contained when its source plan is ignored.
3. Add a lightweight release evidence table with owner, platform, command/device, date, and artifact link.
4. Add tracked contributing/security guidance only if external collaboration becomes a real project goal.

## Decision For Following Phases

The next phase is `Release Hardening And Evidence`.

Do not begin cloud sync, household sharing, receipts, balances, watch companions, or other competitive-expansion work until:

- remote CI verifies the Phase 1-4 commit;
- the accepted iOS/Android release matrix is complete;
- widget shipping status is supported by signed-device evidence;
- every original phase done criterion is either evidenced or explicitly waived.

## Final Status

DONE WITH CONCERNS

## 2026-06-25 Release-Hardening Addendum

Completed:

- tracked Node 22.23.1 contract;
- one aggregate `npm run verify` command used by CI;
- iOS automatic splash appearance, Android dark interface style, and `expo-system-ui`, resolving the prebuild warning contract;
- 52 executable privacy-safe barcode PNG fixtures;
- Apple Vision per-format measurement at 100% recall and 100% precision with no false positives;
- privacy-safe Maestro flows and exact manual native procedures;
- explicit disposition of 12 moderate Expo toolchain audit advisories.

Still open:

- exact-tree remote CI because Git mutation was not authorized;
- Maestro execution because the CLI is unavailable;
- Android API 30 runtime;
- provider/biometric matrices;
- signed widgets and performance;
- interactive iOS 50-image and nearby matrices;
- Jira updates.

Current release-hardening status: `BLOCKED`. See `docs/qa/lcw-64-release-hardening.md`.
