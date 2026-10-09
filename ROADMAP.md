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

- [x] Declarative overlay commands: a `commands` key in the schema, `--open` / `--close` / `--toggle` on `aihio-dialog` through Invoker Commands (with a fallback for older engines), `command` / `commandfor` forwarded by `aihio-button`, an `invalid-command` lint rule, prompt + docs
- [x] `aihio-toggle` delegates to a real `<button aria-pressed>`, as `aihio-button` does
- [x] Dialog: initial focus honours `autofocus` and lands on a rendered tab stop (it picked an unselected tab and ignored `autofocus`); the Tab wrap uses the same tab stops
- [x] Dropdown: Tab closes the menu, typeahead moves to the matching item, and an item whose child is `<a href>` is a real link menuitem (the documented "wrap links in an item" shape never reached the link on Enter)
- [x] Form controls: `aihio-switch` for on/off settings (a real `role="switch"` checkbox; a row inside `aihio-field`), native `textarea` / `select` drawn like `aihio-input` inside a field, and `accent-color` for native checkboxes and radios
- [x] Patterns rebuilt on `aihio-field` / `aihio-stack` / `aihio-cluster`, inside forms with names; settings use switches (not toggles named after their state) and a native `<select>` (not a menu, whose choice never reached the form); destructive confirmation has a trigger and a Cancel that closes
- [x] `aihio-grid`, so the data-card-grid pattern is a grid (it was an unspaced `<div>`)
- [x] Every pattern and variation is rendered and checked with axe in both themes — which caught the alert description's `opacity: 0.9` taking success text to 4.31:1
- [x] Linter: `unknown-attribute`, and a `suggestion` on enum, unknown-component, attribute, and command issues so an agent can fix in one round trip
- [x] MCP: `find` (free text or intent), `list_components`, `list_patterns`, `get_pattern`, and the prompt fragment as the MCP prompt `aihio-authoring`; component descriptions now say when to use each one
- [x] Bundle: light-DOM component CSS moves to `<name>.styles.js`, read only by the CSS build (it already shipped in `aihio.css`) — `dist/aihio.js` 136 → 98 KB minified, 28.6 → 23.7 KB gzip
- [ ] Bundle: the runtime schema (~41 KB of `dist/aihio.js`) leaves the default entry for `aihio/runtime` — breaking for `Aihio.describe()` from the root, so it waits for 3.0
- [x] Avatar fallback: its muted fill is nearly invisible on a card surface (both near zinc-50 in light)
- [x] `aihio-button` as a link: adopt an authored `<a href>` as its control, the way a dropdown item does, so a call-to-action that navigates does not need `href` on a `<button>`

## Phase 10 — A contract you can't break by accident, and docs that show it

A review of the system and the site found the same failure in both: things
that break silently. A token name that needed escaping dropped the docs'
brand gap; a scrim with its own alpha left the drawer undimmed; shadcn's
`--primary` turned every button transparent; a counterexample rendered live
locked the Dialog page. This phase makes those fail loudly, and makes the
docs show what the schema knows.

- [x] Tokens: every custom property is `--aihio-<group>-<name>`, lowercase and hyphenated (half steps are `1-5`), colours are full `oklch()` values with alpha mixed in by `color-mix()`, and a build test fails on any other name, any `var()` nothing defines, or any `oklch(var(…))`
- [x] Three token tiers: the shadcn-named tier merges into `tokens/semantic.json`, so "intent" means only the schema vocabulary; colour names follow it (`primary-action-bg`); `color-scheme` follows the theme; `docs/tokens.json` (`aihio/tokens`) carries resolved values and the measured contrast contract
- [x] `aihio-button` adopts an authored `<a href>`; `href` on it is linted with the wrapped link as the suggestion, and `onclick` navigation is an a11y-contract error
- [x] Every counterexample carries a `fix` and the `rule` that catches it; the build holds both to the linter, and new rules (`boolean-attribute-value`, `hand-rolled-layout`, `cluster-needs-grow`, `alert-role`, `card-click-handler`, `field-error-message`, `switch-state-name`, `toggle-state-name`) catch the 11 that slipped through. a11y issues name their rule in `contract`
- [x] Component examples are linted at build like patterns, and carry a title and description
- [x] Docs: the full API including sub-components, variants drawn from the schema, Don't / Do mistakes with the linter's output, single-column example frames with copy buttons, the accessibility obligations out of their tab, live cards on the index, and pattern previews with a width switch
- [x] Docs: an Intents page, Foundations pages for colour (with the contrast contract), type, space and shape, and motion, search ranked by the MCP `find` function (now `src/schema/find.js`), a rebuilt AI page, `llms.txt`, and every component page as markdown
- [x] Docs checks: no broken link or fragment, no repeated id, no dialog rendered open, and the site's own markup lint-clean
- [x] The dropdown accessibility test waits for the menu's fade-in before axe measures it; mid-fade, partly transparent text failed contrast intermittently
- [ ] Two dropdown browser tests (typeahead, link items) fail intermittently under a full parallel run, when a timer fires late; they pass alone and failed the same way before this phase

## Phase 11 — Tables

Records compared across columns had nothing in the system to reach for: a
model asked for a sortable table wrote one from scratch, with click handlers
on the headers that no keyboard reaches.

- [x] `aihio-table` wraps a native `<table>`, keeping the platform's table semantics: the system's styles, `density`, `data-numeric` figures aligned by place value, row names, figures, and dates that do not wrap, and a scroll box that becomes a named, focusable region when the table is too wide, with shadows at the edges that hide rows, and `sticky-header`
- [x] Sorting by `data-sortable` header buttons, with `aria-sort` as the order: rows load in it, re-sort when script sets it, and take their place when added. Figures and text compare in the page's language, `<time datetime>` and `data-sort-value` give machine-readable keys, the sort is announced, and `manual-sort` leaves the rows to a framework or the server
- [x] Rows move with `moveBefore()` where there is one, so focus inside a row survives, and only ever to just before another row, so React, Vue, and Svelte still find the rows they rendered; all three are exercised in the browser suite
- [x] `nativeElements` in the schema: the attributes a component reads on the native elements it enhances, carried into the minified schema, types, prompt, docs, and the linter's enum and boolean rules
- [x] Linter: `table-accessible-name`, `table-header-cells`, `table-click-handler`, `table-sort-column-name`, and `table-sortable-header`, with suggestions for other systems' table components and attributes (`<aihio-table-row>` → `<tr>`, `aria-sort="asc"` → `"ascending"`)
- [x] A `data-table` pattern: search, a sortable table with row links, statuses, and row menus, pagination by link, and a no-results variation
- [x] `aihio-pagination` for pages of a long list: links with `href` (or buttons without it), `aria-current="page"` marked at 3:1 and by weight, a window of seven that never changes length, and a compact form wherever the full one does not fit on one line
- [x] `aihio-data-grid` for 100,000 rows and more: only the rows in view are rendered, by your code on `aihio-range`, around spacers that keep the scroll height; the WAI-ARIA data grid keyboard with focus that waits for rows not rendered yet; `aria-rowcount` and `aria-rowindex`; sorting shared with `aihio-table` through `src/components/sort-headers.js`. First rows in ~20ms, any scroll position in under 30ms, Control+End in ~5ms
- [ ] Row selection: a select-all checkbox with a mixed state, shift-click ranges, and an announced count, that does not fight a framework holding the checkboxes' state in its own
- [ ] Data grid: rows of more than one line, and more than about 389,000 rows. Firefox stops a box's height at 17.9 million pixels (Chromium and WebKit at 33.5 million), so rows past it cannot be scrolled to; lint and the dev build warn above 350,000

## Phase 12 — Dates

A date had nothing in the system to reach for. A model asked for one wrote
`<aihio-input type="date">`, whose calendar no stylesheet reaches and whose
format follows the browser rather than the page, or a calendar from scratch,
with click handlers on its days.

- [x] `aihio-date-picker`: a date typed the way the page's language writes it (any separator, month names, two-digit years, the language's own digits) or picked from a calendar a button opens under the field. `YYYY-MM-DD` submits through a hidden input, as a native date input submits it; text that is not a date is kept and reported through native validation, with localisable messages
- [x] `aihio-calendar`: the same month grid on the page, a group named by its label, for a date chosen there
- [x] One grid for both (`src/components/calendar-grid.js`), the WAI-ARIA date picker's: a `<table role="grid">` with one tab stop and the arrow, Home, End, and Page keys; each day named by its full date, with `aria-selected`, `aria-current="date"`, and `aria-disabled`; previous and next month buttons and native month and year selects; six weeks always, the days of the months either side filling them, so nothing around it moves
- [x] Languages from `Intl` and the closest `lang` (`src/components/dates.js`): the format, a placeholder written the language's way (`pp.kk.vvvv`, `tt.mm.jjjj`), month and weekday names, the first day of the week (from `Intl.Locale`, or CLDR's regions where the browser cannot say), and always the Gregorian calendar. A `lang` with no region takes the browser's region for that language, so `en` is British English in a browser set to `en-GB`; the page's script is kept, and the week comes from the region even where `Intl` has no dates for it (`zh-Hans-TW`)
- [x] `min`, `max`, and an `isDateDisabled` function: days struck through, a keyboard held between min and max, typed dates outside them invalid, and `aihio-month` to load a month's availability. React 19, Vue, and Svelte all set the function as a property, which the browser suite checks
- [x] Linter: `date-picker-label`, `date-picker-form-name`, `calendar-label`, `calendar-form-name`, `date-value` (a date not written `YYYY-MM-DD`, with the rewrite where the order is certain), `date-range` (min after max), and suggestions for other systems' names (`<aihio-datepicker>`, `min-date`, `week-start`)
- [ ] Range selection: a start and an end in one calendar, two months side by side, and the span previewed under the pointer
- [ ] `required` on `aihio-calendar`: it has no text field to carry native validity. ElementInternals would, at the price of a second way of joining a form

## Sequencing notes

- Phase 1 is the keystone. Everything else depends on its format.
- Phases 2, 3, 5 are independent and can parallelize.
- Phase 4 depends on Phase 1.
- Phase 6 is last because it aggregates everything else.
- Phase 7 rides on Phase 1's format + Phase 4's warning infrastructure.
- Phase 8 is out of scope until earlier phases stabilize.
