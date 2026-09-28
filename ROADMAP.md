# AI-First Roadmap

Plan to turn aihio from "a design system that happens to publish a schema" into a true AI-first interface. Sequenced so earlier phases unblock later ones.

Legend: [x] done · [ ] todo · [~] in progress

## Phase 1 — Schema foundation

Everything else reads from the component schema, so the shape is the keystone.

- [x] Design expanded schema format (add `version`, `intents`, `composition`, `a11yContract`, `counterExamples`)
- [x] Author meta-schema at `src/schema/meta-schema.json`
- [x] Curate intent vocabulary at `src/schema/intents.json`
- [x] Ship zero-dep validator at `src/schema/validate.js`
- [x] Update `src/schema/build.js` to validate every component schema, cross-check intents against the vocabulary, fail fast on unknown keywords
- [x] Emit `dist/schema.json` (human) + `dist/schema.min.json` (agent-token-efficient; prose stripped, structure preserved)
- [x] Migrate all 10 component schemas (alert, avatar, badge, button, card, dialog, dropdown, input, tabs, toggle) with real content
- [x] Extend `test/build.test.js` with schema-shape, minified-output, and validator-error coverage

## Phase 2 — Intent tokens

Expose design tokens by meaning so prompts map cleanly. Primitive + semantic stay; add a third intent tier above semantic.

- [x] Author `tokens/intent.json` (e.g. `color.intent.destructive`, `spacing.intent.form-field-gap`, `radius.intent.interactive`)
- [x] Teach `src/tokens/build.js` to compile intent tokens alongside existing tiers
- [x] Migrate component CSS, one component at a time, to consume intent tokens where semantically appropriate (primitive stays only for internal wiring)
- [x] Document the intent vocabulary in a single page agents can read

## Phase 3 — Patterns library

Agents build pages, not isolated buttons. Patterns encode canonical compositions.

- [x] Create top-level `patterns/` with per-pattern folders
- [x] Pattern shape: `pattern.json` (`id`, `name`, `intents`, `description`, `requiredComponents`, `variations`) + `markup.html` + optional `variations/*.html`
- [x] Seed ~8 patterns: auth form, settings section, empty state, destructive confirmation, data card grid, tabbed settings, inline form with validation, toast-style alert stack
- [x] Merge patterns into `dist/schema.json` under a `patterns` key
- [x] Reference components by intent (not name) inside patterns where possible
- [x] Build-time validation that every `requiredComponents` entry exists in the schema

## Phase 4 — Runtime introspection + versioning

Let live DOM reason about itself; warn authors in dev when they violate the schema.

- [x] Ship `Aihio.describe(tag)` returning the schema entry for a live element (bundle minified schema into the JS entry or lazy-fetch, decide by bundle-size budget)
- [x] Per-component `static schemaVersion` field matching the schema's `version`
- [x] Dev-build console warnings when attributes violate the schema (invalid enum values, missing required a11y)
- [x] Warning for `aihio-dialog` with no `aihio-dialog-title` and no `aria-label` on the host
- [x] Warning for `aihio-input` with no associated `<label>` / `aria-label` / `aria-labelledby`

## Phase 5 — Types from schema

One source of truth for API surface; TypeScript editors get validation for free.

- [x] Codegen step in `src/schema/build.js` that emits `dist/aihio.d.ts`
- [x] Per-component attribute types + JSX intrinsic element augmentations
- [x] Exported union types for intents and variants
- [x] Add `"types": "./dist/aihio.d.ts"` to `package.json` exports
- [x] Add a build test asserting generated types match a known snapshot for at least one component

## Phase 6 — Canonical prompt fragment

Curated guidance beats raw schemas for steering. Ship a tight system-prompt deliverable.

- [x] Author `dist/aihio.prompt.md` (~300 lines) — component inventory with one-line purpose, intent→component map, pattern inventory, hard rules flattened from counterExamples, token intent vocabulary
- [x] Script regenerates schema-derived sections on build; hand-written strategy sections stay manual
- [x] Expose as `./prompt` package export so `import prompt from 'aihio/prompt'` works

## Phase 7 — Counter-examples & a11y contracts surfacing

Content pass that rides on Phases 1 + 4.

- [x] Fill in `counterExamples` + `a11yContract` on every component (seeded in Phase 1; revisit after patterns are authored)
- [x] Phase 4 warnings also fire on a11yContract violations
- [x] Prompt fragment (Phase 6) auto-includes counter-examples

## Phase 8 — Validator + MCP server (deferred)

Explicitly later. When it lands, reuses Phase 1's schema format, Phase 3's patterns, and Phase 7's rules with zero rework.

- [x] `aihio-lint` — takes HTML, returns structured errors against the schema
- [x] MCP server exposing `describe(component)` + `lint(markup)` over stdio
- [x] Test suite of known-bad markup snippets the linter must catch

## Phase 9 — Markup that works

Phases 1–8 made generated markup *valid*. This phase makes it *work*: an agent
that follows the schema, the patterns, and the linter should produce UI whose
buttons do something, whose labels are true, and whose overlays behave like
the platform's own. Ordered by how often the gap bites generated markup.

- [ ] Declarative overlay commands: a `commands` key in the schema, `--open` / `--close` / `--toggle` on `aihio-dialog` through Invoker Commands (with a fallback for older engines), `command` / `commandfor` forwarded by `aihio-button`, an `invalid-command` lint rule, prompt + docs
- [ ] `aihio-toggle` delegates to a real `<button aria-pressed>`, as `aihio-button` does
- [ ] Dialog: drop the hand-written Tab trap that `showModal()` makes redundant; initial focus honours `autofocus` and skips hidden content
- [ ] Dropdown: Tab closes the menu, typeahead moves to the matching item, `href` makes an item a real link
- [ ] Form controls: styled native `textarea` / `select` / checkbox / radio, and an `aihio-switch` for on/off settings
- [ ] Patterns rebuilt on `aihio-field` / `aihio-stack` / `aihio-cluster`, inside forms with names; settings use switches, not toggles named after their state; destructive confirmation has a trigger and a Cancel that closes
- [ ] Linter: `unknown-attribute`, and a `suggestion` on enum, unknown-component, and command issues so an agent can fix in one round trip
- [ ] MCP: `list_components`, `find_by_intent`, `get_pattern`, and the prompt fragment as an MCP prompt
- [ ] Bundle: light-DOM component CSS stays out of the JS (it already ships in `aihio.css`); the runtime schema leaves the default entry (breaking — 3.0)

## Sequencing notes

- Phase 1 is the keystone. Everything else depends on its format.
- Phases 2, 3, 5 are independent and can parallelize.
- Phase 4 depends on Phase 1.
- Phase 6 is last because it aggregates everything else.
- Phase 7 rides on Phase 1's format + Phase 4's warning infrastructure.
- Phase 8 is out of scope until earlier phases stabilize.
