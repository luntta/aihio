# Aihio Prompt Fragment

Use this fragment when you want an AI system to generate Aihio UI quickly and correctly. It is intentionally biased toward safe, schema-backed markup over novelty.

## Strategy

- Match user intent to components before thinking about visual styling.
- Start from a seeded pattern when the request already resembles auth, settings, empty states, destructive confirmations, tabbed settings, inline validation, toast alerts, or a table of records.
- Use native HTML for document semantics around Aihio custom elements.
- When markup needs CSS of its own, use the semantic tokens below (`var(--aihio-color-muted-fg)`, `var(--aihio-spacing-stack-md)`), never raw colours or pixel values. `data-aihio-intent` annotations say what an element is for.
- Adapt existing variants, sizes, slots, and compositions instead of inventing new APIs.

## Authoring Rules

- Only use documented Aihio tags, related subcomponents, attributes, and pattern compositions.
- Keep custom-element trees shallow and follow required slots, children, and parent relationships.
- Treat boolean attributes as presence or absence, never stringified booleans.
- A call to action that goes to another page is a link drawn as a button: `<aihio-button><a href="/pricing">See pricing</a></aihio-button>`. Never navigate from a click handler, and never put `href` on `aihio-button`.
- A table of records is `<aihio-table>` around a native `<table>`: a `<caption>` (or `aria-labelledby` pointing at the heading above it), `<th scope="col">` in a `<thead>`, and `<th scope="row">` for the cell that names each row. Make a column sortable with `data-sortable` on its `<th>`, never with click handlers on headers, cells, or rows; link the row's name instead of making the row clickable. For more rows than a page can hold (thousands and up), show one page with `aihio-pagination` and `manual-sort`; use `aihio-data-grid`, which renders only the rows in view, when the list has to be one continuous scroll.
- Open and close overlays from markup: give the overlay an `id`, and put `commandfor="<id>"` plus one of its declared commands (such as `command="--open"`) on the `aihio-button` that controls it. Never use built-in commands like `show-modal` on an Aihio component.
- When the request is ambiguous, choose the simplest accessible composition that satisfies the intent.
- If a seeded pattern already fits, adapt that pattern instead of freehanding the structure.

<!-- GENERATED:component-inventory -->

<!-- GENERATED:intent-map -->

<!-- GENERATED:pattern-inventory -->

<!-- GENERATED:a11y-obligations -->

<!-- GENERATED:hard-rules -->

<!-- GENERATED:token-vocabulary -->
