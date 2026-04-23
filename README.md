# Aihio

AI-first design system built on native web components. Zero dependencies.

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
import 'aihio';
```

That entrypoint auto-registers all custom elements. If you only want the classes without side effects:

```js
import { AihioButton, AihioDialog } from 'aihio/components';
```

The root bundle also exposes `Aihio.describe()` for runtime introspection:

```js
import { Aihio } from 'aihio';

const buttonSchema = Aihio.describe('aihio-button');
// { $component: 'aihio-button', version: '1.0.0', ... }
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

For MCP clients that launch local stdio servers, the package also ships `aihio-mcp` with two tools: `describe` and `lint`.

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
| `aihio-button` | Button with 6 variants (default, secondary, outline, ghost, link, destructive) and 4 sizes |
| `aihio-input` | Text input with size variants and error state |
| `aihio-card` | Content container with header, title, description, content, and footer sub-components |
| `aihio-badge` | Small status indicator with 4 variants |
| `aihio-alert` | Callout for important messages with title/description slots |
| `aihio-avatar` | Image avatar with fallback initials |
| `aihio-toggle` | Toggle button with pressed state |
| `aihio-tabs` | Tabbed interface with keyboard navigation |
| `aihio-dialog` | Modal dialog with focus trap, ESC to close, backdrop |
| `aihio-dropdown` | Dropdown menu with keyboard navigation and click-outside |

## AI-First

Every component ships a JSON schema describing its API — attributes, slots, events, example markup, and now a seeded patterns library for multi-component page sections. The merged schema is available at `dist/schema.json`.

```js
const schema = await fetch('node_modules/aihio/dist/schema.json').then(r => r.json());
// { $schema: "aihio-design-system", version: "2.0.0", components: [...], patterns: [...] }
```

AI agents can use this schema to understand and generate correct markup without reading documentation. For styling decisions, the generated intent-token vocabulary is available at `dist/intent-tokens.md`.

The seeded patterns cover higher-level compositions such as auth forms, settings sections, destructive confirmations, tabbed settings, and toast-style alert stacks.

The component schemas also include author-facing `a11yContract` requirements and multiple `counterExamples` per component, so prompts, docs, and dev warnings can all point back to the same source-of-truth rules.

In dev builds, connected components also emit console warnings for schema-backed mistakes such as invalid enum attributes and machine-checkable `a11yContract` violations including unnamed icon buttons and toggles, unnamed dialogs, unlabeled inputs, icon-only dropdown triggers without labels, destructive alerts without announced content, and mismatched tab/panel values.

## Tokens

Design tokens follow the [W3C Design Token Community Group](https://tr.designtokens.org/format/) format, defined in JSON and compiled to CSS custom properties. Colors use Oklch for perceptual uniformity.

Four tiers:
- **Primitive** (`tokens/base.json`) — raw values (colors, spacing, typography, radius, shadows)
- **Semantic** (`tokens/semantic.json`) — theme roles (background, foreground, primary, destructive, etc.)
- **Intent** (`tokens/intent.json`) — component-facing meaning (surface, action-primary, form-field-gap, interactive radius, etc.)
- **Component** (`tokens/component.json`) — component-level tokens (button height, input height, etc.)

Intent tokens compile to CSS custom properties without collapsing the alias chain, so overriding a lower tier still flows upward.

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
npm run build     # Build dist/
npm run docs:build  # Build the Eleventy docs site into _site/
npm run docs:test   # Validate generated docs HTML assumptions
npm run test      # Rebuild dist/ and run node and headless browser checks
npm run check     # Run tests, build docs, and validate the docs output
npm exec aihio-mcp  # Start the local MCP server over stdio
npm run tokens    # Rebuild tokens only
npm run styles    # Rebuild generated component CSS
npm run schema    # Rebuild schema only
```

## License

MIT
