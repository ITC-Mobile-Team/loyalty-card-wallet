# LCW-4 Cards UI QA Notes

Date: 2026-06-10

## Scope

LCW-4 implements the Cards grid, card detail, edit/delete flows, notes support, and UI refresh after card mutations.

## Automated Verification

- `npm run typecheck`: passed.
- `npm test`: passed.
- `npm run lint`: passed.

## App Start And Smoke Test

Expo Metro was first started with:

```sh
npx expo start --localhost --port 8082
```

The dev server responded at `http://localhost:8082`, and the booted iOS simulator accepted the Expo URL through `xcrun simctl openurl`.

Interactive smoke testing of Cards, detail, edit/delete, and refresh behavior was not completed because Expo Go could not connect to the generated development bundle URL inside the simulator. The simulator displayed a native red-screen connection error for `http://127.0.0.1:8082/node_modules/expo-router/entry.bundle?...`.

Follow-up on 2026-06-11: the simulator connection issue was resolved by starting Expo in LAN mode with:

```sh
REACT_NATIVE_PACKAGER_HOSTNAME=192.168.1.55 npx expo start --lan --port 8082
```

The bundle endpoint returned `200 OK` and Expo Go loaded the app behind its first-run developer-menu overlay. Further simulator UI smoke testing requires manually tapping `Continue` in Expo Go because this environment cannot send simulator tap events through macOS Accessibility permissions.

Android smoke testing was not available because `adb devices` reported no connected devices.

## LCW-28 Scanner QA Gap

LCW-28 remains blocked for device-level scanner QA in this environment. Available checks showed iOS simulators only and no Android device. A Jira comment was added to LCW-28 recording that physical camera/device scanner QA is still needed.

## Follow-Up

- Run LCW-4 Cards UI smoke testing on a working Expo Go/dev-client setup or local simulator configuration that can fetch Metro bundles.
- Run scanner QA for LCW-28 on at least one physical camera-capable iOS or Android device.
