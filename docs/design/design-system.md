# Design System

## Direction

The MVP uses a dark, native mobile utility style. It should be quiet, fast to scan, and optimized for repeated checkout use. The design should look at home on iOS while remaining practical for React Native and Android.

The app should reproduce the reference functionality and interaction model, while using its own visual style and identity.

## Color Tokens

| Token | Hex | Use |
| --- | --- | --- |
| `surface.app` | `#0A0A0B` | Main app background. |
| `surface.raised` | `#1C1C1E` | Cards, sheets, tab bars, grouped lists. |
| `surface.field` | `#2C2C2E` | Inputs, search fields, disabled controls. |
| `surface.barcode` | `#FFFFFF` | Barcode panel background only. |
| `text.primary` | `#F5F5F7` | Titles, primary labels, selected tab labels. |
| `text.secondary` | `#C7C7CC` | Supporting labels and card metadata. |
| `text.muted` | `#8E8E93` | Placeholders, inactive icons, helper text. |
| `border.separator` | `#38383A` | Hairlines and grouped-list separators. |
| `action.danger` | `#FF453A` | Delete actions and destructive alerts. |
| `action.focus` | `#64D2FF` | Focus rings, scan highlights, accessibility emphasis. |
| `overlay.scrim` | `rgba(0,0,0,0.55)` | Modal and action-sheet backdrop. |

Brand card backgrounds may use merchant-specific colors when user-provided or generated locally. Keep the shell neutral so the card visuals carry most of the color.

## Typography

Use the platform system font through React Native. Define semantic text roles so screen implementations stay consistent.

| Role | Size | Line height | Weight | Use |
| --- | ---: | ---: | ---: | --- |
| `title.large` | 34 | 41 | 700 | Main wallet title. |
| `title.modal` | 22 | 28 | 700 | Modal and scanner titles. |
| `body.primary` | 17 | 22 | 400 | Form fields, rows, card numbers. |
| `body.strong` | 17 | 22 | 600 | Primary row labels and selected tabs. |
| `caption` | 13 | 18 | 400 | Secondary metadata and helper text. |
| `button` | 17 | 22 | 600 | Primary actions and modal actions. |

Support Dynamic Type. Do not scale type by viewport width.

## Spacing

Use an 8-point grid with allowed values: `4`, `8`, `12`, `16`, `20`, `24`, `32`, `40`. All screens must respect safe-area insets. Checkout-critical screens should keep the barcode visible above the fold on standard iPhone sizes.

## Radius

| Element | Radius |
| --- | ---: |
| Card tile | 16 |
| Barcode panel | 12 |
| Inputs and search fields | 10 |
| Action sheets and modal top corners | 14 |
| Icon buttons | 22 minimum hit area with circular visual shape |

## Core Components

### Card Tile

- Fixed two-column grid on phones when width allows.
- Aspect ratio between `1.45` and `1.6`.
- Shows merchant name, optional logo/image, and optional last digits.
- Must support color fallback with merchant initials.
- Long merchant names wrap to two lines without resizing the tile.

### Barcode Panel

- Always uses `surface.barcode`.
- Has enough padding that barcode quiet zones are not clipped.
- Shows the human-readable card number below the barcode.
- Provides a copy action for the card number.

### Search Field

- Uses `surface.field`.
- Includes search icon, clear icon when populated, and placeholder text.
- Keeps the catalog list visible while the keyboard is open.

### Action Sheet

- Native bottom-sheet style.
- Destructive actions use `action.danger`.
- Cancel is visually separated.
- Never contains more than five actions in one sheet.

### Scanner Frame

- Full-screen camera preview when available.
- Centered scan frame with high-contrast border.
- Manual entry and photo import are always reachable.

### Tab Bar

- Use tabs only for persistent product areas.
- MVP tabs: `Cards`, `Stores`, and `Account`.
- Add-card flow is a scanner-first modal launched from the Cards screen plus button, not a tab.

## Motion

Use native modal, push, and sheet transitions. Avoid decorative animation. Respect reduced-motion settings and never rely on animation to explain state.
