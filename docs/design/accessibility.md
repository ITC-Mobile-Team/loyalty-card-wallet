# Accessibility

Accessibility is part of the MVP definition of done for every screen.

## Touch Targets

- Minimum target size is 44 by 44 points.
- Icon-only buttons need accessible labels.
- The scanner, add-card, and barcode actions must remain reachable with one hand on common phone sizes.

## VoiceOver

Required labels:
- Card tile: merchant name plus card number suffix when available.
- Add card button: `Add card`.
- Barcode copy button: `Copy card number`.
- Scanner frame: describe that the camera is scanning for a barcode.
- Delete action: include the merchant name in the confirmation.
- Shared card save button: include the merchant name, for example `Save shared card from Test Market`.

Do not announce decorative card art or background images.

## Dynamic Type

- Support system text scaling through React Native text styles.
- Card tiles keep fixed dimensions and allow text wrapping or truncation.
- Forms must remain scrollable when the keyboard is open.
- Barcode panels should stay visible on detail screens at normal text sizes; at larger text sizes, scrolling is acceptable if the barcode is first in the content order.
- Shared card preview must remain scrollable on small phones and large Dynamic Type, with merchant identity before metadata and actions.

## Contrast

- Text must meet WCAG AA contrast for the chosen background.
- Barcode panels must stay pure white with dark barcode content.
- Disabled controls need a visible disabled state without falling below readable contrast for labels.

## Reduced Motion

- Respect reduced-motion settings.
- Avoid decorative motion.
- Sheet and navigation transitions may use native defaults.

## Non-Visual Access

- Card numbers must be readable as text and copyable.
- Scanner failures must provide manual entry.
- Permission-denied states must explain the next available action without requiring users to inspect the camera preview.
