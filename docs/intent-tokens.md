# Aihio Intent Tokens

Generated from `tokens/intent.json` by `src/tokens/build.js`.

Intent tokens sit above semantic and primitive tokens so component styles can ask for meaning, not raw scale positions.

- `color.intent.*` tokens are theme-aware and map through `tokens/semantic.json`.
- Shared intent tokens for spacing, radius, typography, elevation, and motion map through primitive or component tokens.
- Components should prefer intent tokens for public-facing styling decisions and keep raw primitive usage for internal wiring only.

## color

Theme-aware color intents used by components and page-level chrome.

| Token | CSS Variable | Source | Description |
| --- | --- | --- | --- |
| `color.intent.action-accent-bg` | `--color-intent-action-accent-bg` | `semantic.accent` | Hover and pressed highlight background for neutral controls. |
| `color.intent.action-accent-fg` | `--color-intent-action-accent-fg` | `semantic.accent-foreground` | Foreground on hover and pressed highlight backgrounds. |
| `color.intent.action-primary-bg` | `--color-intent-action-primary-bg` | `semantic.primary` | Default filled action background. |
| `color.intent.action-primary-fg` | `--color-intent-action-primary-fg` | `semantic.primary-foreground` | Foreground on default filled actions. |
| `color.intent.action-secondary-bg` | `--color-intent-action-secondary-bg` | `semantic.secondary` | Lower-emphasis filled action background. |
| `color.intent.action-secondary-fg` | `--color-intent-action-secondary-fg` | `semantic.secondary-foreground` | Foreground on lower-emphasis filled actions. |
| `color.intent.border-subtle` | `--color-intent-border-subtle` | `semantic.border` | Default border color for surfaces and outlines. |
| `color.intent.field-border` | `--color-intent-field-border` | `semantic.input` | Default border color for editable form fields. |
| `color.intent.focus-ring` | `--color-intent-focus-ring` | `semantic.ring` | Focus indication ring for keyboard interactions. |
| `color.intent.overlay-bg` | `--color-intent-overlay-bg` | `semantic.popover` | Surface background for transient overlays such as dropdowns. |
| `color.intent.overlay-fg` | `--color-intent-overlay-fg` | `semantic.popover-foreground` | Foreground on transient overlays. |
| `color.intent.overlay-scrim` | `--color-intent-overlay-scrim` | `0 0 0 / 0.8` | Modal backdrop scrim behind blocking overlays. |
| `color.intent.page-bg` | `--color-intent-page-bg` | `semantic.background` | Default page canvas and neutral active backgrounds. |
| `color.intent.page-fg` | `--color-intent-page-fg` | `semantic.foreground` | Primary foreground on the page canvas. |
| `color.intent.state-destructive-bg` | `--color-intent-state-destructive-bg` | `semantic.destructive` | Destructive emphasis background and error color. |
| `color.intent.state-destructive-fg` | `--color-intent-state-destructive-fg` | `semantic.destructive-foreground` | Foreground on destructive emphasis backgrounds. |
| `color.intent.surface-bg` | `--color-intent-surface-bg` | `semantic.card` | Raised surface background for cards, alerts, and dialog panels. |
| `color.intent.surface-fg` | `--color-intent-surface-fg` | `semantic.card-foreground` | Primary foreground on raised surfaces. |
| `color.intent.surface-muted-bg` | `--color-intent-surface-muted-bg` | `semantic.muted` | Muted fill for grouped controls and subdued surfaces. |
| `color.intent.surface-muted-fg` | `--color-intent-surface-muted-fg` | `semantic.muted-foreground` | Supporting foreground on muted fills. |

## spacing

Layout spacing tokens that encode component rhythm rather than raw scale values.

| Token | CSS Variable | Source | Description |
| --- | --- | --- | --- |
| `spacing.intent.cluster-gap-tight` | `--spacing-intent-cluster-gap-tight` | `spacing.1` | Tight spacing inside grouped interactive controls and menu chrome. |
| `spacing.intent.control-gap` | `--spacing-intent-control-gap` | `spacing.2` | Default inline gap between icons, labels, and grouped actions. |
| `spacing.intent.field-padding-block` | `--spacing-intent-field-padding-block` | `spacing.2` | Block padding for default form fields. |
| `spacing.intent.field-padding-block-lg` | `--spacing-intent-field-padding-block-lg` | `spacing.2.5` | Block padding for spacious form fields. |
| `spacing.intent.field-padding-block-sm` | `--spacing-intent-field-padding-block-sm` | `spacing.1` | Block padding for compact form fields. |
| `spacing.intent.field-padding-inline` | `--spacing-intent-field-padding-inline` | `spacing.3` | Inline padding for default form fields. |
| `spacing.intent.field-padding-inline-lg` | `--spacing-intent-field-padding-inline-lg` | `spacing.4` | Inline padding for spacious form fields. |
| `spacing.intent.field-padding-inline-sm` | `--spacing-intent-field-padding-inline-sm` | `spacing.2` | Inline padding for compact form fields. |
| `spacing.intent.form-field-gap` | `--spacing-intent-form-field-gap` | `spacing.3` | Recommended gap between labels, help text, and form controls. |
| `spacing.intent.stack-lg` | `--spacing-intent-stack-lg` | `spacing.6` | Large separation for footer action areas and major section breaks. |
| `spacing.intent.stack-md` | `--spacing-intent-stack-md` | `spacing.4` | Standard section spacing within surfaced components. |
| `spacing.intent.stack-sm` | `--spacing-intent-stack-sm` | `spacing.3` | Short vertical separation between related blocks such as alert content and panels. |
| `spacing.intent.stack-tight` | `--spacing-intent-stack-tight` | `spacing.1.5` | Compact vertical rhythm for headings with short supporting copy. |

## radius

Corner-radius choices for surfaced and interactive affordances.

| Token | CSS Variable | Source | Description |
| --- | --- | --- | --- |
| `radius.intent.interactive` | `--radius-intent-interactive` | `radius.md` | Default corner radius for buttons, inputs, toggles, and menus. |
| `radius.intent.interactive-compact` | `--radius-intent-interactive-compact` | `radius.sm` | Tighter radius for dense interactive children such as tabs and menu items. |
| `radius.intent.pill` | `--radius-intent-pill` | `radius.full` | Fully rounded presentation for badges, avatars, and pill-shaped affordances. |
| `radius.intent.surface` | `--radius-intent-surface` | `radius.lg` | Corner radius for cards, alerts, and other framed surfaces. |

## fontSize

Text-size intents for body copy, controls, and surfaced headings.

| Token | CSS Variable | Source | Description |
| --- | --- | --- | --- |
| `fontSize.intent.badge` | `--fontSize-intent-badge` | `fontSize.xs` | Dense label size for badges and tiny metadata chips. |
| `fontSize.intent.body` | `--fontSize-intent-body` | `fontSize.base` | Default document body text size. |
| `fontSize.intent.body-sm` | `--fontSize-intent-body-sm` | `fontSize.sm` | Supporting text size for descriptions and secondary copy. |
| `fontSize.intent.control` | `--fontSize-intent-control` | `fontSize.sm` | Default text size for controls. |
| `fontSize.intent.control-lg` | `--fontSize-intent-control-lg` | `fontSize.base` | Larger text size for prominent controls. |
| `fontSize.intent.control-sm` | `--fontSize-intent-control-sm` | `fontSize.xs` | Compact text size for small controls. |
| `fontSize.intent.heading` | `--fontSize-intent-heading` | `fontSize.2xl` | Large surface title size. |
| `fontSize.intent.heading-sm` | `--fontSize-intent-heading-sm` | `fontSize.lg` | Compact surface title size for dialogs and smaller panels. |

## fontWeight

Weight intents for body text, controls, and headings.

| Token | CSS Variable | Source | Description |
| --- | --- | --- | --- |
| `fontWeight.intent.badge` | `--fontWeight-intent-badge` | `fontWeight.semibold` | Dense emphasis weight for badges. |
| `fontWeight.intent.body` | `--fontWeight-intent-body` | `fontWeight.normal` | Default document body weight. |
| `fontWeight.intent.control` | `--fontWeight-intent-control` | `fontWeight.medium` | Emphasized but compact weight for controls and inline titles. |
| `fontWeight.intent.heading` | `--fontWeight-intent-heading` | `fontWeight.semibold` | Strong surface-heading weight. |

## lineHeight

Line-height intents for readable body copy and compact labels.

| Token | CSS Variable | Source | Description |
| --- | --- | --- | --- |
| `lineHeight.intent.body` | `--lineHeight-intent-body` | `lineHeight.normal` | Default readable line height for body and field text. |
| `lineHeight.intent.compact` | `--lineHeight-intent-compact` | `lineHeight.none` | Tight line height for headings, labels, and short control text. |

## shadow

Elevation intents for surfaces and overlays.

| Token | CSS Variable | Source | Description |
| --- | --- | --- | --- |
| `shadow.intent.modal` | `--shadow-intent-modal` | `shadow.lg` | Deeper elevation for blocking modal dialogs. |
| `shadow.intent.overlay` | `--shadow-intent-overlay` | `shadow.md` | Elevation for popovers and transient overlays. |
| `shadow.intent.surface` | `--shadow-intent-surface` | `shadow.sm` | Subtle elevation for surfaced content. |

## duration

Motion timing intents for feedback and overlay entrance.

| Token | CSS Variable | Source | Description |
| --- | --- | --- | --- |
| `duration.intent.feedback` | `--duration-intent-feedback` | `duration.normal` | Default control feedback transition duration. |
| `duration.intent.feedback-fast` | `--duration-intent-feedback-fast` | `duration.fast` | Fast hover and menu-item feedback transitions. |
| `duration.intent.overlay` | `--duration-intent-overlay` | `duration.slow` | Entrance timing for larger blocking overlays. |
