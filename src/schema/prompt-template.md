# Aihio Prompt Fragment

Use this fragment when you want an AI system to generate Aihio UI quickly and correctly. It is intentionally biased toward safe, schema-backed markup over novelty.

## Strategy

- Match user intent to components before thinking about visual styling.
- Start from a seeded pattern when the request already resembles auth, settings, empty states, destructive confirmations, tabbed settings, inline validation, or toast alerts.
- Use native HTML for document semantics around Aihio custom elements.
- Prefer intent tokens and `data-aihio-intent` annotations when you need to explain meaning.
- Adapt existing variants, sizes, slots, and compositions instead of inventing new APIs.

## Authoring Rules

- Only use documented Aihio tags, related subcomponents, attributes, and pattern compositions.
- Keep custom-element trees shallow and follow required slots, children, and parent relationships.
- Treat boolean attributes as presence or absence, never stringified booleans.
- When the request is ambiguous, choose the simplest accessible composition that satisfies the intent.
- If a seeded pattern already fits, adapt that pattern instead of freehanding the structure.

<!-- GENERATED:component-inventory -->

<!-- GENERATED:intent-map -->

<!-- GENERATED:pattern-inventory -->

<!-- GENERATED:a11y-obligations -->

<!-- GENERATED:hard-rules -->

<!-- GENERATED:token-vocabulary -->
