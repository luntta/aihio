# Aihio

AI-first design system built on native web components. Zero runtime dependencies.

Aihio is designed for AI agents to generate markup predictably — every component has a machine-readable schema, predictable attributes, flat composition, and an intent-token layer that maps prompt meaning onto concrete UI decisions. Visually it follows a clean, minimal aesthetic with an extensive Oklch-based token system and light/dark mode support.

## Install

```bash
npm install aihio
```

## Usage

```html
<link rel="stylesheet" href="node_modules/aihio/dist/aihio.css">
<script type="module" src="node_modules/aihio/dist/aihio.js"></script>

<aihio-button variant="outline">Click me</aihio-button>
```

Or import as a module:

```js
import 'aihio/css';
import 'aihio';
```

That entrypoint auto-registers all custom elements.

During development, import the dev bundle instead to get schema-backed console
warnings for invalid attributes and accessibility-contract violations:

```js
import 'aihio/dev';   // same components, warnings installed
```

The warnings are a separate module that the production bundle never imports, so
`dist/aihio.js` carries none of that code. If you only want the classes without side effects:

```js
import { AihioButton, AihioDialog } from 'aihio/components';
```

Each component also has a focused, tree-shakeable entrypoint. These entrypoints
export classes but do not register them for you:

```js
import 'aihio/css';
import { AihioButton } from 'aihio/button';

if (!customElements.get(AihioButton.tag)) {
  customElements.define(AihioButton.tag, AihioButton);
}
```

The same form is available for all 15 top-level components. Import
`aihio/runtime` when schema inspection is needed without importing component
implementations.

The root bundle also exposes `Aihio.describe()` for runtime introspection:

```js
import { Aihio } from 'aihio';

const buttonSchema = Aihio.describe('aihio-button');
// { $component: 'aihio-button', version: '1.5.0', ... }
```

Schema-derived TypeScript declarations ship in `dist/aihio.d.ts`, including intent and variant unions plus JSX element typings:

```tsx
import type { AihioButtonVariant, AihioIntent } from 'aihio';

const variant: AihioButtonVariant = 'outline';
const intent: AihioIntent = 'primary-action';

export function Toolbar() {
  return <aihio-button data-aihio-intent={intent} variant={variant}>Save</aihio-button>;
}
```

The package also exports a canonical prompt fragment for AI systems:

```js
import prompt from 'aihio/prompt';
```

Schema-backed markup linting is available both as a library and a CLI:

```js
import { lintMarkup } from 'aihio/lint';

const result = lintMarkup('<aihio-button variant="primary"></aihio-button>');
```

```bash
aihio-lint ./example.html
cat ./example.html | aihio-lint -
```

Alongside the composition and `a11yContract` rules, the linter checks
`data-aihio-intent` annotations against the schema: `unknown-intent` for a name
outside the vocabulary, and `intent-mismatch` for a real intent on a component
that does not declare it. Annotating is optional, but an annotation that is
present has to be true.

```bash
$ aihio-lint badge.html
<aihio-badge> is annotated data-aihio-intent="primary-action",
but its schema declares status, labeling, metadata.
```

`unknown-attribute` reports anything on an Aihio element that its schema does
not declare — `href` or `icon` on a button, `spacing` on a stack — since the
browser never will: nothing reads an invented attribute. Global HTML
attributes, `aria-*`, `data-*`, event handlers, and template bindings
(`@click`, `:value`, `v-if`) are left alone.

Where the fix is unambiguous, an issue carries a `suggestion`: the replacement
tag, attribute, or value, written as markup. It covers vocabulary carried over
from other design systems as well as typos, so an agent can apply it without
parsing the message:

```js
lintMarkup('<aihio-button variant="primary">Save</aihio-button>').issues[0].suggestion;
// 'variant="default"'
lintMarkup('<aihio-modal></aihio-modal>').issues[0].suggestion;
// '<aihio-dialog>'
```

A few rules catch markup that is valid but does not do what it says:
`boolean-attribute-value` (`pressed="false"` turns a toggle on: a boolean
attribute is on whenever it is present), `cluster-needs-grow` (a justified
cluster in a card footer, where it has no room to justify), and
`hand-rolled-layout` (an inline `display: grid` or `flex` that one of the
layout primitives replaces). An `a11y-contract` issue names the obligation it
enforces in `contract`, such as `button-accessible-name`.

For MCP clients that launch local stdio servers, the package also ships
`aihio-mcp`. Its tools take an agent from a request to checked markup:

| Tool | Returns |
| --- | --- |
| `find` | Components and patterns ranked against what the UI has to do (`"confirm before deleting a project"`) or an intent name |
| `list_components`, `list_patterns` | The whole inventory, with each entry's purpose and intents |
| `get_pattern` | A canonical pattern's lint-clean markup and variations |
| `describe` | One component's full schema |
| `lint` | Structured issues, with a `suggestion` where the fix is unambiguous |

The prompt fragment is served as the MCP prompt `aihio-authoring`.

```json
{
  "mcpServers": {
    "aihio": {
      "command": "aihio-mcp"
    }
  }
}
```

## Components

| Component | Description |
|-----------|-------------|
| `aihio-stack` | Vertical layout primitive applying the system spacing scale |
| `aihio-cluster` | Horizontal layout primitive for button rows, badge lists, and toolbars |
| `aihio-grid` | Grid of equal columns, such as cards, that drops columns as it narrows |
| `aihio-field` | Form field wrapper that lays out label, control, description, and error, and wires the ARIA between them |
| `aihio-button` | Button with 6 variants (default, secondary, outline, ghost, link, destructive) and 4 sizes; wraps an `<a href>` to draw a link as a button |
| `aihio-input` | Text input with size variants and error state |
| `aihio-switch` | On/off setting (a real `<input type="checkbox" role="switch">`) that submits with its form |
| `aihio-combobox` | Filterable single-select field with keyboard navigation, async options, and optional free text |
| `aihio-card` | Content container with header, title, description, content, and footer sub-components |
| `aihio-badge` | Small status indicator with 6 variants (default, secondary, outline, success, warning, destructive) |
| `aihio-alert` | Callout with title/description slots and 4 variants; only `destructive` announces assertively |
| `aihio-avatar` | Image avatar with fallback initials |
| `aihio-toggle` | Pressed/unpressed button (a real `<button aria-pressed>`), such as Bold in a toolbar |
| `aihio-tabs` | Tabbed interface with keyboard navigation |
| `aihio-dialog` | Modal dialog with focus trap, ESC to close, backdrop |
| `aihio-dropdown` | Dropdown menu with keyboard navigation, typeahead, and link items (`<aihio-dropdown-item><a href>`) |

## AI-First

Every component ships a JSON schema describing its API — attributes, slots, events, example markup, and now a seeded patterns library for multi-component page sections. The merged schema is available at `dist/schema.json`.

```js
const schema = await fetch('node_modules/aihio/dist/schema.json').then(r => r.json());
// { $schema: "aihio-design-system", version: "2.0.0", components: [...], patterns: [...] }
```

AI agents can use this schema to understand and generate correct markup without reading documentation. For styling decisions, the generated intent-token vocabulary is available at `dist/intent-tokens.md`.

The seeded patterns cover higher-level compositions such as auth forms, settings sections, destructive confirmations, tabbed settings, and toast-style alert stacks.

The component schemas also include author-facing `a11yContract` requirements and multiple `counterExamples` per component, so prompts, docs, and dev warnings can all point back to the same source-of-truth rules. Each counterexample carries its `fix`, and the `rule` that catches it. The build holds them to the linter: a counterexample has to be reported under the rule it names (one that names none, a judgment the linter cannot make, has to pass), and every fix, example, and pattern has to lint clean.

When you import `aihio/dev`, connected components also emit console warnings for schema-backed mistakes such as invalid enum attributes and machine-checkable `a11yContract` violations including unnamed icon buttons and toggles, unnamed dialogs, unlabeled inputs, icon-only dropdown triggers without labels, destructive alerts without announced content, and mismatched tab/panel values.

## Forms

`aihio-button` wraps a real light-DOM `<button>` and `aihio-input` a real
light-DOM `<input>`, so a form built from Aihio components submits like any
other:

```html
<form>
  <aihio-field>
    <label slot="label">Email</label>
    <aihio-input type="email" name="email" autocomplete="email" required></aihio-input>
    <span slot="description">Use your work address.</span>
  </aihio-field>

  <aihio-cluster grow justify="end">
    <aihio-button variant="outline" type="reset">Clear</aihio-button>
    <aihio-button type="submit">Sign in</aihio-button>
  </aihio-cluster>
</form>
```

- `type="submit"` is forwarded to the control, which is an ordinary submit
  button in the form: native constraint validation runs first, `Enter` in a
  field submits, and `SubmitEvent.submitter` identifies the button that did it.
  `type="reset"` resets the form.
- The control is a member of `form.elements` and is disabled and re-enabled by
  `<fieldset disabled>`, natively and in both directions.
- `name` on `aihio-input` is what puts the value in `FormData`. Without it the
  field submits nothing, and both the linter and the dev build say so.
- Like a native input, the host's `value` **attribute** is the reset/default
  value and its `value` **property** is live state. Typing never writes the live
  value back into HTML, so serializing the element does not leak passwords or
  other user-entered data. Set `defaultValue` when you intend to change both
  the reset value and the `value` attribute.
- Native validation is exposed through `validity`, `validationMessage`,
  `willValidate`, `checkValidity()`, `reportValidity()`, and
  `setCustomValidity()`; the delegated control is available as `control`.
- `aihio-field` generates the ids and wires `aria-labelledby` and
  `aria-describedby`, pointing the description at the error message while the
  field is erroring. Clicking either a native `<label>` or other
  `slot="label"` content focuses the delegated input.

### Switches and native controls

`aihio-switch` is the on/off setting: a real `<input type="checkbox"
role="switch">` that submits `name=value` when on and nothing when off. Inside
`aihio-field` it lays out as a row, the switch beside its label:

```html
<aihio-field>
  <label slot="label">Email notifications</label>
  <aihio-switch name="email-notifications" checked></aihio-switch>
  <span slot="description">A digest of activity, sent weekly.</span>
</aihio-field>
```

As with a native checkbox, the `checked` attribute is the reset default and
the `checked` property is live state. Use `aihio-toggle` for a pressed state
that does not submit, such as Bold in a toolbar.

Aihio leaves `<textarea>`, `<select>`, checkboxes, and radios to the platform.
Inside `aihio-field` a `<textarea>` or `<select>` is wired and drawn like
`aihio-input`, and `accent-color` puts native checkboxes, radios, and range
inputs in the theme.

### Combobox

`aihio-combobox` is the field for choosing one option from a list too long to
scan, or from a search. It submits the chosen option's `value`, not the label
on show:

```html
<aihio-field>
  <label slot="label">Country</label>
  <aihio-combobox name="country" value="fi" required>
    <aihio-option value="fi">Finland</aihio-option>
    <aihio-option value="se">Sweden</aihio-option>
    <aihio-option value="ax">Åland Islands</aihio-option>
  </aihio-combobox>
</aihio-field>
```

- Typing filters without regard to case or accents (`aland` finds
  `Åland Islands`), ranks prefix matches first, sets the matched text in bold,
  and highlights the best match so Enter or Tab takes it.
- The text can never disagree with the value. Leaving the field keeps an exact
  match, and otherwise puts back the chosen option's label, so a field that
  looks filled in is filled in. Add `allow-custom` to accept free text instead.
- The keyboard follows the WAI-ARIA combobox pattern: arrows (with Alt),
  PageUp/PageDown, Enter, Escape, and Tab. DOM focus never leaves the input.
  Escape on a closed field is left alone, so it still closes a surrounding
  dialog.
- For options from a server, set `filter="none"`, listen for `aihio-search`,
  and replace the `<aihio-option>` children, toggling `loading` while the
  request is in flight. A polite status region announces the result count once
  typing pauses; `results-text`, `empty-text`, and `loading-text` localise it.

The `<aihio-option>` children are the data the list is rendered from, and
they stay exactly where they were written. That is what lets React, Vue, or
Svelte own them: the framework adds and removes its own nodes, and the
component re-renders the list from them. `host.replaceChildren(...options)`
is fine too. The component puts back the input it would otherwise take with
it, and focus with it, so typing is not interrupted.

## Dialogs

A dialog opens and closes from markup, with no script, through the platform's
[Invoker Commands](https://developer.mozilla.org/en-US/docs/Web/API/Invoker_Commands_API):

```html
<aihio-button commandfor="delete-project" command="--open" variant="destructive">
  Delete project
</aihio-button>

<aihio-dialog id="delete-project">
  <aihio-dialog-header>
    <aihio-dialog-title>Delete project?</aihio-dialog-title>
  </aihio-dialog-header>
  <form method="post">
    <aihio-dialog-footer>
      <aihio-button commandfor="delete-project" command="--close" variant="outline">Cancel</aihio-button>
      <aihio-button type="submit" variant="destructive">Delete project</aihio-button>
    </aihio-dialog-footer>
  </form>
</aihio-dialog>
```

- `aihio-dialog` answers `--open`, `--close`, and `--toggle`. A `--close`
  arrives as an `aihio-before-close` with reason `"command"`, so it can still
  be refused, and focus goes back to the button that opened the dialog.
- The commands are custom (`--`-prefixed) because the platform only delivers
  built-in ones such as `show-modal` to a native `<dialog>`, and this one is
  inside the component's shadow root. `command="show-modal"` renders, activates,
  and does nothing; the linter reports it as `invalid-command`, and the dev
  build warns when it is clicked.
- `commandfor` and `command` work on `aihio-button` and on a plain `<button>`.
  Engines without the API get the same behaviour from a small fallback.
- The declared commands are part of the schema (`commands`), so
  `Aihio.describe('aihio-dialog').commands` lists them.

## Layout

Four primitives keep page composition inside the token system instead of in
hand-written CSS:

```html
<aihio-stack gap="lg">          <!-- vertical rhythm -->
<aihio-cluster justify="end">   <!-- horizontal groups, wraps -->
<aihio-grid columns="3">        <!-- equal columns, fewer as it narrows -->
<aihio-field>                   <!-- label + control + message -->
```

`aihio-grid` needs no breakpoints: its columns are never narrower than 16rem,
so it drops one when it runs out of room, responding to its own width rather
than the viewport's. `columns` caps how many there are.

`aihio-cluster` is sized to its content, so add `grow` when you need `justify`
to distribute across a row inside a flex parent such as a card footer.

## Events

Every event a component dispatches carries an `aihio-` prefix:

| Event | Dispatched by | `detail` |
| --- | --- | --- |
| `aihio-input` | `aihio-input` | `{ value }` |
| `aihio-change` | `aihio-input` | `{ value }` |
| `aihio-change` | `aihio-combobox` | `{ value, label }` |
| `aihio-change` | `aihio-switch` | `{ checked }` |
| `aihio-search` | `aihio-combobox` | `{ query }` |
| `aihio-toggle` | `aihio-toggle` | `{ pressed }` |
| `aihio-open`, `aihio-close` | `aihio-dialog`, `aihio-dropdown` | — |
| `aihio-open` | `aihio-combobox` | — |
| `aihio-close` | `aihio-combobox` | `{ reason }` |
| `aihio-before-close` | `aihio-dialog`, `aihio-dropdown` | `{ reason }` |
| `aihio-select` | `aihio-dropdown-item` | `{ value }` |
| `aihio-tab-select` | `aihio-tab` | `{ value }` |

They all bubble and are composed, which is exactly why the prefix matters: an
unprefixed `close`, `toggle`, `select`, or `input` reaching a listener higher up
the tree would be indistinguishable from the native event of the same name.

`aihio-before-close` is cancelable. Call `preventDefault()` to keep an overlay
open while, for example, an unsaved-changes confirmation is shown.

`aihio-input` deliberately leaves the native events alone rather than
re-dispatching them. Its inner `<input>` is real light DOM, so native `input`
and `change` bubble through the host on their own, with `event.target.value`
carrying the value. Listen to the native pair for `v-model`-style bindings, or
to the prefixed pair when you want `detail`.

## Frameworks

Components are light DOM unless they need a shadow root (only `aihio-dialog`,
`aihio-dropdown`, and `aihio-tabs` do), every attribute is a string or boolean,
and nothing takes an object or array prop. That is the shape that survives a
virtual DOM without a wrapper layer.

React 19, Vue 3, and Svelte 5 are exercised in the browser test suite. Each can
set the `value` property and receive the native bubbling `input` event without
a wrapper component.

**Vue** templates need the tags marked as custom elements, or Vue will try to
resolve them as Vue components and warn on every one:

```js
// vite.config.js
vue({
  template: {
    compilerOptions: { isCustomElement: (tag) => tag.startsWith('aihio-') },
  },
})
```

After that, bind `:value` and update your model from `@input`; custom events such
as `@aihio-tab-select` are available directly.

**Svelte** needs no configuration. Use `value={value}` with `oninput`; Svelte's
`bind:value` directive is restricted to native form controls. Hyphenated custom
events can be attached directly.

**React 19** sets recognized custom-element properties directly. `value={value}`
and `onInput={handler}` therefore work as expected.

### Wrapped native controls

`aihio-button`, `aihio-toggle`, `aihio-input`, and `aihio-switch` render a real control in
their own light DOM rather than emulating one, because that is the only way a
component participates in a form the way the platform does. For the buttons
that means the children they are given are moved into the `<button>` when the
element upgrades:

```html
<aihio-button>Save</aihio-button>
<!-- becomes -->
<aihio-button><button type="button">Save</button></aihio-button>
```

Static and server-rendered markup is unaffected. Aihio also watches direct child
updates and re-adopts new label nodes into the delegated control; this behavior
is covered by the React, Vue, and Svelte browser harnesses. When a framework
should own the complete control subtree, author the native button explicitly:

```jsx
<aihio-button><button type="submit">{label}{spinner}</button></aihio-button>
```

An authored `<button>` is adopted rather than duplicated, and keeps its own
`type` unless the host states one.

### Links that look like buttons

A button does not navigate. For a call to action that goes to another page,
put an `<a href>` inside `aihio-button`: the link becomes the control and takes
the variant and size, and no `<button>` is created.

```html
<aihio-button variant="outline"><a href="/pricing">See pricing</a></aihio-button>
```

It stays a real link: announced as one, with its URL on hover, open-in-new-tab,
and navigation before the module has loaded, since the stylesheet draws it as
a button from the first paint. `disabled` and `loading` take it out of the tab
order, set `aria-disabled="true"`, and cancel its clicks; the form and command
attributes, which configure a `<button>`, are not forwarded to it.

The linter steers the other shapes here. `href` (or a router's `to`) on
`aihio-button` is reported with the wrapped link as its `suggestion`, and an
`onclick` that sets `location` is an `a11y-contract` error.

### Server rendering

Custom elements do not upgrade on the server, so SSR'd markup is live HTML
before the defining module has run. Light DOM components are styled by
`aihio.css` from the first paint and simply lack behaviour until hydration.
The shadow components would instead print their children inline — a dialog body
in the middle of the page, a menu spilled under its trigger — so `aihio.css`
holds them back until they are defined (`src/css/pre-upgrade.css`). Nothing is
required of the consumer, but note that if the module never loads, a dialog and
a dropdown menu stay hidden rather than appearing without behaviour.

### Native overlays

`aihio-dialog` delegates modality to `<dialog>.showModal()`, including the
browser's inert outside document and top-layer backdrop. `aihio-dropdown` uses
a manual Popover API surface when available, with a fallback for older engines,
so Escape and outside-click close requests can still be canceled. Menus are
positioned against the trigger, flip above it when needed, and clamp to the
viewport. A shared scroll lock keeps the page locked until the final stacked
dialog closes.

## Verification

```bash
npm test                 # unit, schema, linter, and browser fixture tests
npm run typecheck        # generated declarations + JSX contract
npm run test:browsers    # Chromium, Firefox, WebKit + React/Vue/Svelte harnesses
```

CI installs all three Playwright engines and runs the complete `npm run check`
pipeline, including documentation and automated accessibility checks.

## Tokens

Design tokens follow the [W3C Design Token Community Group](https://tr.designtokens.org/format/) format, defined in JSON and compiled to CSS custom properties. Colors use Oklch for perceptual uniformity.

Four tiers:
- **Primitive** (`tokens/base.json`) — raw values (colors, spacing, typography, radius, shadows)
- **Semantic** (`tokens/semantic.json`) — theme roles (background, foreground, primary, destructive, etc.)
- **Intent** (`tokens/intent.json`) — component-facing meaning (surface, action-primary, form-field-gap, interactive radius, etc.)
- **Component** (`tokens/component.json`) — component-level tokens (button height, input height, etc.)

Intent tokens compile to CSS custom properties without collapsing the alias chain, so overriding a lower tier still flows upward.

### Palette

The neutral ramp is monochrome — hue 286 at near-zero chroma — and runs to true
white (`zinc.0`) and true black (`zinc.1000`), so a page canvas is untinted in
both themes rather than a very light or very dark grey.

Light and dark are built as mirror images rather than as two separate palettes:
a pure canvas, an elevated surface one step off it, and a hairline that only
just separates the two.

| Role | Light | Dark |
| --- | --- | --- |
| `page-bg` | `zinc.0` (`#ffffff`) | `zinc.1000` (`#000000`) |
| `surface-bg` | `zinc.50` (`#f5f5f7`) | `zinc.950` (`#161617`) |
| `border-subtle` | `zinc.200` | `zinc.850` |
| `overlay-highlight-bg` | `zinc.100` | `zinc.800` |

`overlay-highlight-bg` marks the active item inside an overlay. It exists
because `accent` and the overlay surface are the same `zinc.900` in the dark
theme, so a highlight drawn with `accent` would be invisible there.

Because the elevated surface differs from the canvas in both themes, cards,
alerts, and dialogs read as raised without needing a shadow to prove it.

### Typography

The type stack (`fontFamily.sans`) leads with the platform UI face, so text
renders in the grey the OS already optimises for and no webfont ships — the
package stays zero-dependency.

`letterSpacing.*` tightens as type grows (`display` -0.025em, `heading`
-0.018em, `body` -0.011em), because the same em value reads looser at larger
sizes. `letterSpacing.wide` is the one positive value, reserved for small
capitalised labels. Components read these through `--letterSpacing-intent-*`
rather than hardcoding a tracking value.

### Contrast

`src/tokens/build.js` checks the palette against a contract of foreground and
background pairs — 4.5:1 for body-size text, 3:1 for the boundary of an
interactive control — and fails the build if any pair regresses. Card and alert
borders are deliberately excluded: they are decorative framing, not the kind of
boundary WCAG 1.4.11 covers, and holding them to 3:1 would make every surface
in the system shout. Field borders are covered, because on an empty input the
border is the only thing marking the control.

Add or change a pair in `CONTRAST_REQUIREMENTS` in `src/tokens/contrast.js`.
It currently checks 16 pairs per theme, 32 in total.

### State colours

The palette carries four state intents — neutral, `success`, `warning`, and
`destructive` — available on `aihio-alert` and `aihio-badge`. Warning pairs a
light amber fill with a dark foreground in both themes, because an amber that
passes 4.5:1 against white text is no longer amber.

There is no separate `info` colour. Neutral is the informational state, which
keeps the palette to what the system can actually keep accessible.

### Motion

Component transitions are timed from `--duration-intent-*`, and
`@media (prefers-reduced-motion: reduce)` collapses those tokens to `1ms` — one
place, no `!important`, and consumer animation is left alone. Looping and
entrance keyframes are switched off at their own declaration instead, since a
1ms infinite rotation is a strobe. A build test fails if a component gains an
animation without a reduced-motion guard.

### Forced colours

Under `forced-colors: active` the OS replaces backgrounds and text colours, so
anything whose state reads only as a fill disappears — a pressed toggle, a
selected tab, a filled button. Every such state is restated with system colour
keywords (`ButtonFace`/`ButtonText`, `Highlight`/`HighlightText`, `GrayText`,
`FieldText`), and the input error state widens its border rather than relying
on colour at all.

### Dark mode

Dark mode works automatically via `prefers-color-scheme`, or manually:

```html
<html data-theme="dark">
```

### Customization

Override CSS custom properties to theme the entire system:

```css
:root {
  --primary: 0.55 0.2 260;
  --color-intent-action-primary-bg: var(--primary);
  --radius-intent-surface: 1rem;
}
```

## Docs Site

The design system docs site is built with Eleventy and generated from the same emitted schema and token artifacts that ship in `dist/`.

```bash
npm run docs:build   # Build the package and the Eleventy docs site into _site/
npm run docs:dev     # Watch dist/ + docs source and serve the Eleventy site
```

The site uses Aihio components in the docs UI itself and currently includes:

- Overview page
- Generated component index and per-component reference pages
- Pattern library
- Token foundations page
- AI and tooling overview

## Development

```bash
npm install
npm run dev       # Dev server at localhost:3000/
npm run build     # Build dist/ (production + dev bundles)
npm run docs:build  # Build the Eleventy docs site into _site/
npm run docs:test   # Validate generated docs HTML assumptions
npm run test      # Rebuild dist/ and run node and headless browser checks
npm run check     # Run tests, build docs, and validate the docs output
npm exec aihio-mcp  # Start the local MCP server over stdio
npm run tokens    # Rebuild tokens only (also enforces the contrast contract)
npm run styles    # Rebuild generated component CSS
npm run schema    # Rebuild schema only
```

## License

MIT
