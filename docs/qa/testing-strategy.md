# Testing Strategy

The MVP should keep tests focused on risks: local data integrity, barcode behavior, navigation, and checkout-critical UI.

## Test Layers

| Layer | Purpose | Examples |
| --- | --- | --- |
| Typecheck | Catch contract drift across modules. | Card model changes, route params, repository interfaces. |
| Unit tests | Validate isolated logic. | Card number normalization, barcode format selection, catalog search. |
| Repository tests | Protect local data behavior. | Create, update, delete, migration, error recovery. |
| Component tests | Verify UI behavior without a full device run. | Empty card grid, validation messages, disabled save button. |
| Manual mobile QA | Validate native behavior. | Camera permissions, scanner fallback, keyboard handling, barcode visibility. |
| Visual QA | Catch layout regressions. | Card grid, detail barcode panel, scanning mode, dynamic type. |

## MVP Test Priorities

1. Card creation and storage.
2. Scanner-first add-card flow.
3. Card editing and deletion confirmation.
4. Barcode rendering from stored card values.
5. Private image persistence and export/import.
6. Scanner fallback paths.
7. Navigation between Cards, Stores, Account, Add Card, Detail, Edit, and Scanning Mode.

## Test Data

Use synthetic merchant names and synthetic card numbers in tests. Do not commit real loyalty card numbers or real user images.

## Manual QA Checklist Link

Use `docs/qa/mobile-qa-checklist.md` for general device QA and `docs/qa/visual-qa-checklist.md` for screen-level visual QA.

## Done Criteria

For every implemented MVP flow:
- Core logic has tests.
- UI has at least one focused behavior test where practical.
- Permission-denied and validation states are manually checked.
- Known test gaps are recorded in the related plan or PR notes.
