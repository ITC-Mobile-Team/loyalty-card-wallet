# ADR 0005: Private Card Images And Sharing

## Status

Accepted on 2026-06-10.

## Context

The MVP should let users attach card images and share cards through export/import. The user also wants card images stored in a way that cannot be casually browsed as normal image files in the phone file system.

Mobile operating systems already sandbox app data, but storing imported card images as loose files still creates more lifecycle and exposure risk than storing them behind the app data layer.

## Decision

Store card images in app-private local storage controlled by the data layer, not as user-visible media files.

Preferred MVP approach:
- store normalized image bytes or encoded image payloads in SQLite through the card repository,
- store derived thumbnails in the same app-private data layer,
- do not keep permanent card images in the public photo library,
- delete temporary import/camera files after the image is persisted,
- include images in export/import bundles only when the user explicitly chooses to share or backup card data.

If SQLite image payloads become too slow or too large, the project may switch to app-private encrypted file storage through a new ADR. Do not switch back to plain file URI storage without a privacy review.

## Consequences

- Image import/export must be versioned with the card schema.
- Repository APIs should hide whether images are stored as blobs, encoded text, or private files.
- Tests must cover image cleanup and import/export compatibility.
- Large images must be resized before storage to avoid database bloat.

## Alternatives Considered

- Public photo library storage: rejected because card images should not be visible outside the app by default.
- App document directory with file URIs: simpler and common, but weaker for the requested privacy model.
- No images in MVP: rejected because card images are required for the reference-like experience.
