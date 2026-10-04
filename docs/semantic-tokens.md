# Aihio Semantic Tokens

Generated from `tokens/semantic.json` by `src/tokens/build.js`. The same data, with resolved values for both themes, is in `tokens.json`.

Semantic tokens name what a value is for: `--aihio-color-surface-bg`, `--aihio-spacing-stack-md`. Components read only these and their own component tokens; the primitive scales beneath them are wiring. Write them exactly as listed: every name is `--aihio-<group>-<name>`, lowercase and hyphenated.

- Colours are themed. Each has a light and a dark value, switched by `prefers-color-scheme` or `data-theme` on any element.
- Colours are full values: `color: var(--aihio-color-page-fg)`. For transparency, mix: `color-mix(in oklch, var(--aihio-color-page-fg) 40%, transparent)`.

## color

Themed colours, named for what they colour. Each has a light and a dark value.

| CSS variable | Source | Description |
| --- | --- | --- |
| `--aihio-color-border-subtle` | light: `--aihio-color-zinc-200`; dark: `--aihio-color-zinc-850` | Default border color for surfaces and outlines. |
| `--aihio-color-control-highlight-bg` | light: `--aihio-color-zinc-100`; dark: `--aihio-color-zinc-900` | Hover and pressed highlight background for neutral controls. |
| `--aihio-color-control-highlight-fg` | light: `--aihio-color-zinc-900`; dark: `--aihio-color-zinc-50` | Foreground on hover and pressed highlight backgrounds. |
| `--aihio-color-destructive-bg` | light: `--aihio-color-red-600`; dark: `--aihio-color-red-600` | Destructive emphasis background and error color. |
| `--aihio-color-destructive-fg` | light: `--aihio-color-zinc-0`; dark: `--aihio-color-zinc-0` | Foreground on destructive emphasis backgrounds. |
| `--aihio-color-destructive-text` | light: `--aihio-color-red-600`; dark: `--aihio-color-red-400` | Destructive text and iconography drawn directly on page or surface backgrounds, where the emphasis background is not used. |
| `--aihio-color-field-border` | light: `--aihio-color-zinc-500`; dark: `--aihio-color-zinc-550` | Default border color for editable form fields. |
| `--aihio-color-focus-ring` | light: `--aihio-color-zinc-900`; dark: `--aihio-color-zinc-300` | Focus indication ring for keyboard interactions. |
| `--aihio-color-muted-bg` | light: `--aihio-color-zinc-50`; dark: `--aihio-color-zinc-950` | Muted fill for grouped controls and subdued surfaces. |
| `--aihio-color-muted-fg` | light: `--aihio-color-zinc-550`; dark: `--aihio-color-zinc-450` | Supporting foreground on muted fills. |
| `--aihio-color-overlay-bg` | light: `--aihio-color-zinc-0`; dark: `--aihio-color-zinc-900` | Surface background for transient overlays such as dropdowns. |
| `--aihio-color-overlay-fg` | light: `--aihio-color-zinc-900`; dark: `--aihio-color-zinc-50` | Foreground on transient overlays. |
| `--aihio-color-overlay-highlight-bg` | light: `--aihio-color-zinc-100`; dark: `--aihio-color-zinc-800` | The highlighted item inside an overlay: the active combobox option or a hovered dropdown item. It has to differ from overlay-bg, which control-highlight-bg does not in the dark theme. |
| `--aihio-color-overlay-scrim` | `oklch(0 0 0 / 0.8)` | Modal backdrop scrim behind blocking overlays. |
| `--aihio-color-page-bg` | light: `--aihio-color-zinc-0`; dark: `--aihio-color-zinc-1000` | Default page canvas and neutral active backgrounds. |
| `--aihio-color-page-fg` | light: `--aihio-color-zinc-900`; dark: `--aihio-color-zinc-50` | Primary foreground on the page canvas. |
| `--aihio-color-placeholder-bg` | light: `--aihio-color-zinc-200`; dark: `--aihio-color-zinc-800` | Fill for something that stands in for missing content, such as an avatar's initials. One step off both the page and a surface, where muted-bg matches the surface and disappears into a card. |
| `--aihio-color-placeholder-fg` | light: `--aihio-color-zinc-700`; dark: `--aihio-color-zinc-300` | Text on the placeholder fill. |
| `--aihio-color-primary-action-bg` | light: `--aihio-color-zinc-900`; dark: `--aihio-color-zinc-50` | Default filled action background. |
| `--aihio-color-primary-action-fg` | light: `--aihio-color-zinc-0`; dark: `--aihio-color-zinc-1000` | Foreground on default filled actions. |
| `--aihio-color-secondary-action-bg` | light: `--aihio-color-zinc-100`; dark: `--aihio-color-zinc-900` | Lower-emphasis filled action background. |
| `--aihio-color-secondary-action-fg` | light: `--aihio-color-zinc-900`; dark: `--aihio-color-zinc-50` | Foreground on lower-emphasis filled actions. |
| `--aihio-color-success-bg` | light: `--aihio-color-green-600`; dark: `--aihio-color-green-600` | Emphasis background for confirmed and healthy states. |
| `--aihio-color-success-fg` | light: `--aihio-color-zinc-0`; dark: `--aihio-color-zinc-0` | Foreground on success emphasis backgrounds. |
| `--aihio-color-success-text` | light: `--aihio-color-green-600`; dark: `--aihio-color-green-400` | Success text and iconography drawn directly on page or surface backgrounds. |
| `--aihio-color-surface-bg` | light: `--aihio-color-zinc-50`; dark: `--aihio-color-zinc-950` | Raised surface background for cards, alerts, and dialog panels. |
| `--aihio-color-surface-fg` | light: `--aihio-color-zinc-900`; dark: `--aihio-color-zinc-50` | Primary foreground on raised surfaces. |
| `--aihio-color-warning-bg` | light: `--aihio-color-amber-400`; dark: `--aihio-color-amber-400` | Emphasis background for states that need attention but are not failures. |
| `--aihio-color-warning-fg` | light: `--aihio-color-zinc-900`; dark: `--aihio-color-zinc-1000` | Foreground on warning emphasis backgrounds. Dark, because an accessible amber fill is light in both themes. |
| `--aihio-color-warning-text` | light: `--aihio-color-amber-700`; dark: `--aihio-color-amber-400` | Warning text and iconography drawn directly on page or surface backgrounds. |

## spacing

Gaps and padding, named for the rhythm they set rather than a step on the scale.

| CSS variable | Source | Description |
| --- | --- | --- |
| `--aihio-spacing-cluster-gap-tight` | `--aihio-spacing-1` | Tight spacing inside grouped interactive controls and menu chrome. |
| `--aihio-spacing-control-gap` | `--aihio-spacing-2` | Default inline gap between icons, labels, and grouped actions. |
| `--aihio-spacing-field-padding-block` | `--aihio-spacing-2` | Block padding for default form fields. |
| `--aihio-spacing-field-padding-block-lg` | `--aihio-spacing-2-5` | Block padding for spacious form fields. |
| `--aihio-spacing-field-padding-block-sm` | `--aihio-spacing-1` | Block padding for compact form fields. |
| `--aihio-spacing-field-padding-inline` | `--aihio-spacing-3` | Inline padding for default form fields. |
| `--aihio-spacing-field-padding-inline-lg` | `--aihio-spacing-4` | Inline padding for spacious form fields. |
| `--aihio-spacing-field-padding-inline-sm` | `--aihio-spacing-2` | Inline padding for compact form fields. |
| `--aihio-spacing-form-field-gap` | `--aihio-spacing-3` | Recommended gap between labels, help text, and form controls. |
| `--aihio-spacing-stack-lg` | `--aihio-spacing-6` | Large separation for footer action areas and major section breaks. |
| `--aihio-spacing-stack-md` | `--aihio-spacing-4` | Standard section spacing within surfaced components. |
| `--aihio-spacing-stack-sm` | `--aihio-spacing-3` | Short vertical separation between related blocks such as alert content and panels. |
| `--aihio-spacing-stack-tight` | `--aihio-spacing-1-5` | Compact vertical rhythm for headings with short supporting copy. |

## radius

Corner rounding for surfaces and controls.

| CSS variable | Source | Description |
| --- | --- | --- |
| `--aihio-radius-interactive` | `--aihio-radius-md` | Default corner radius for buttons, inputs, toggles, and menus. |
| `--aihio-radius-interactive-compact` | `--aihio-radius-sm` | Tighter radius for dense interactive children such as tabs and menu items. |
| `--aihio-radius-pill` | `--aihio-radius-full` | Fully rounded presentation for badges, avatars, and pill-shaped affordances. |
| `--aihio-radius-surface` | `--aihio-radius-lg` | Corner radius for cards, alerts, and other framed surfaces. |

## font-family

Typefaces for interface text and fixed-width data.

| CSS variable | Source | Description |
| --- | --- | --- |
| `--aihio-font-family-body` | `--aihio-font-family-sans` | Interface and body typeface for every component and page surface. |
| `--aihio-font-family-code` | `--aihio-font-family-mono` | Typeface for code samples, markup, token names, and other fixed-width data. |

## font-size

Text sizes for body copy, controls, and surface titles.

| CSS variable | Source | Description |
| --- | --- | --- |
| `--aihio-font-size-badge` | `--aihio-font-size-xs` | Dense label size for badges and tiny metadata chips. |
| `--aihio-font-size-body` | `--aihio-font-size-base` | Default document body text size. |
| `--aihio-font-size-body-sm` | `--aihio-font-size-sm` | Supporting text size for descriptions and secondary copy. |
| `--aihio-font-size-control` | `--aihio-font-size-sm` | Default text size for controls. |
| `--aihio-font-size-control-lg` | `--aihio-font-size-base` | Larger text size for prominent controls. |
| `--aihio-font-size-control-sm` | `--aihio-font-size-xs` | Compact text size for small controls. |
| `--aihio-font-size-heading` | `--aihio-font-size-xl` | Large surface title size. Sized to lead a card, not to headline a page — a title much larger than this stops reading as part of the surface it sits on. |
| `--aihio-font-size-heading-sm` | `--aihio-font-size-lg` | Compact surface title size for dialogs and smaller panels. |

## font-weight

Weights for body text, controls, and headings.

| CSS variable | Source | Description |
| --- | --- | --- |
| `--aihio-font-weight-badge` | `--aihio-font-weight-semibold` | Dense emphasis weight for badges. |
| `--aihio-font-weight-body` | `--aihio-font-weight-normal` | Default document body weight. |
| `--aihio-font-weight-control` | `--aihio-font-weight-medium` | Emphasized but compact weight for controls and inline titles. |
| `--aihio-font-weight-heading` | `--aihio-font-weight-semibold` | Strong surface-heading weight. |

## letter-spacing

Optical tracking, tightening as type grows.

| CSS variable | Source | Description |
| --- | --- | --- |
| `--aihio-letter-spacing-body` | `--aihio-letter-spacing-normal` | Default body and control tracking. Slightly negative, because the system stack sets a touch wide at UI sizes. |
| `--aihio-letter-spacing-display` | `--aihio-letter-spacing-tighter` | Tracking for large display type, where glyph gaps open up as size grows. |
| `--aihio-letter-spacing-heading` | `--aihio-letter-spacing-tight` | Tracking for surface titles and section headings. |
| `--aihio-letter-spacing-label` | `--aihio-letter-spacing-wide` | Positive tracking for the one place it earns its keep: small capitalised labels. |

## line-height

Line heights for readable copy and compact labels.

| CSS variable | Source | Description |
| --- | --- | --- |
| `--aihio-line-height-body` | `--aihio-line-height-normal` | Default readable line height for body and field text. |
| `--aihio-line-height-compact` | `--aihio-line-height-none` | Tight line height for headings, labels, and short control text. |

## shadow

Elevation for surfaces and overlays.

| CSS variable | Source | Description |
| --- | --- | --- |
| `--aihio-shadow-modal` | `--aihio-shadow-lg` | Deeper elevation for blocking modal dialogs. |
| `--aihio-shadow-overlay` | `--aihio-shadow-md` | Elevation for popovers and transient overlays. |
| `--aihio-shadow-surface` | `--aihio-shadow-sm` | Subtle elevation for surfaced content. |

## duration

Motion timing for feedback and overlay entrance. Collapsed to 1ms under reduced motion, except the spinner.

| CSS variable | Source | Description |
| --- | --- | --- |
| `--aihio-duration-feedback` | `--aihio-duration-normal` | Default control feedback transition duration. |
| `--aihio-duration-feedback-fast` | `--aihio-duration-fast` | Fast hover and menu-item feedback transitions. |
| `--aihio-duration-overlay` | `--aihio-duration-slow` | Entrance timing for larger blocking overlays. |
| `--aihio-duration-spinner` | `--aihio-duration-spin` | One full rotation of an indeterminate busy indicator. |
