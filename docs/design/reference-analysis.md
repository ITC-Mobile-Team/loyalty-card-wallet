# Reference Analysis

The screenshots in `docs/imagesForDesign/` are treated as product references, not assets to copy. They show the level of native polish, hierarchy, and checkout speed expected from the MVP.

| File | Reference screen | Useful patterns to adopt | Patterns to avoid |
| --- | --- | --- | --- |
| `IMG_5825.PNG` | Card grid | Dark app surface, large native title, prominent add button, two-column card tiles, brand color/image variety, fast access to card detail, Cards/Offers/Account tab model. | Copying exact tile artwork or third-party brand assets. |
| `IMG_5826.PNG` | Card detail | Clear top navigation, visual card header, large high-contrast barcode panel, readable card number, secondary rows for notes and pictures. | Making checkout-critical barcode access compete with editing or decorative content. |
| `IMG_5827.PNG` | Detail action sheet | Native bottom action sheet, destructive delete separated from neutral actions, cancel action. | Hiding important primary actions only behind the overflow menu. |
| `IMG_5828.PNG` | Scanning mode | Full-screen checkout mode, white barcode panels, clear cancel affordance, explanatory callout for scanners. | Low-contrast barcodes, excessive chrome, or relying on rotation without fallback. |
| `IMG_5829.PNG` | Edit form | Modal editing, focused text input, save action in the navigation bar, simple image change row. | Saving invalid card data or losing edits when keyboard appears. |
| `IMG_5830.PNG` | Image source sheet | Small action sheet with camera, library, and cancel options. | Presenting permissions late without recovery guidance. |
| `IMG_5831.PNG` | Account/settings | Dense settings list, grouped rows, dark surface consistency. | Account-first flows in the MVP; the app is local-first and does not require sign-in. |
| `IMG_5833.PNG` | Offers empty state | Straightforward empty state and tab consistency. | Depending on a remote public offers API before a data source is chosen. |
| `IMG_5834.PNG` | Add card catalog | Search-first catalog, frequently added list, alphabetical index, clear "Other card" fallback. | Requiring users to find an exact merchant before adding a generic card. |
| `IMG_5835.PNG` | Scanner | Full-screen scanner, visible scan frame, manual entry fallback, photo fallback. | Blocking card creation when camera permission is denied or scanning fails. |

## Product Interpretation

The app should feel like a native utility, not a marketing surface. The first screen should be the actual wallet, not an onboarding hero or explanation page. Users open the app most often when they are already at checkout, so the design must optimize for recognition, fast tap targets, and stable layouts. The reference functionality should be mirrored closely, while the visual identity can be original.

## Legal And Brand Boundary

Do not ship copied logos or merchant artwork unless they are user-provided, generated placeholders, or explicitly licensed. The default card visuals should use simple colors, initials, and optional user-selected images.
