# ADR 0002: React Native, Expo, And TypeScript

## Status

Accepted for MVP

## Date

2026-06-10

## Context

The project needs a cross-platform mobile app for iOS and Android. The owner is learning React and React Native for the first time, so the stack should reduce native setup friction and keep the learning path coherent.

The app needs camera access, barcode scanning, image picking, file storage, SQLite, and eventually mobile builds.

## Decision

Use React Native with Expo and TypeScript for the MVP.

Use Expo Router for navigation unless a later implementation spike shows a blocking limitation.

Target minimum runtime versions:
- iOS 18.0.
- Android 11, API level 30.

Configure those minimums during scaffold/build setup and verify them against the selected Expo SDK version.

## Rationale

- Expo gives a practical starting point for camera, image picker, SQLite, filesystem, permissions, and builds.
- TypeScript makes data models, navigation params, and service boundaries explicit.
- Expo Router keeps screen organization close to the file system, which is useful for learning and for agent navigation.
- iOS 18 and Android 11 keep the supported device matrix modern enough for scanner, image, and storage APIs while avoiding older-platform edge cases in the MVP.
- The stack can move to Expo prebuild or custom native code later if barcode or image workflows need deeper platform access.

## Consequences

- Some native libraries may require a development build instead of Expo Go.
- Built-in image cropping may not be identical on iOS and Android.
- We should keep platform-specific assumptions documented in `qa/` and `architecture/`.
- Raising or lowering minimum platform versions requires an ADR update and a QA matrix update.

## Alternatives Considered

- Bare React Native: more native control, but higher setup and maintenance cost.
- Flutter: strong mobile tooling, but it would not satisfy the React learning goal.
- Native Swift/Kotlin: best platform control, but much slower for a cross-platform pet project.
