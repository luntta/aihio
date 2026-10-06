// Light-DOM styles for aihio-card.
//
// They ship in aihio.css: src/css/build.js collects every *.styles.js.
// Nothing imports this module at runtime, so the CSS is not carried a
// second time inside the JavaScript bundles.

export default {
  'aihio-card': `
    /* The card owns the spacing: one --aihio-card-padding at every edge and
       between every section. When each section padded itself it left one side
       open for a neighbour that might not be there, so a header alone had no
       bottom inset, a footer alone no top, a header over a footer no gap, and
       a paragraph written straight into the card no inset at all. */
    aihio-card {
      display: flex;
      flex-direction: column;
      gap: var(--aihio-card-padding);
      padding: var(--aihio-card-padding);
      border-radius: var(--aihio-radius-surface);
      background-color: var(--aihio-color-surface-bg);
      color: var(--aihio-color-surface-fg);
      border: 1px solid var(--aihio-color-border-subtle);
      box-shadow: var(--aihio-shadow-surface);
    }

    /* A wrapper around the sections, usually the <form> their submit button
       belongs to, spaces them the way the card would. */
    aihio-card > :has(> :is(aihio-card-header, aihio-card-content, aihio-card-footer)) {
      display: flex;
      flex-direction: column;
      gap: inherit;
    }

    aihio-card[variant="outline"] {
      box-shadow: none;
    }

    aihio-card-header {
      display: flex;
      flex-direction: column;
      gap: var(--aihio-spacing-stack-tight);
    }

    aihio-card-title {
      display: block;
      font-size: var(--aihio-font-size-heading);
      font-weight: var(--aihio-font-weight-heading);
      line-height: var(--aihio-line-height-compact);
      letter-spacing: var(--aihio-letter-spacing-heading);
    }

    aihio-card-description {
      display: block;
      font-size: var(--aihio-font-size-body-sm);
      color: var(--aihio-color-muted-fg);
    }

    aihio-card-content {
      display: block;
    }

    aihio-card-footer {
      display: flex;
      /* Footers hold action rows. Unwrapped, a second button pushed straight
         through the card edge on narrow viewports. */
      flex-wrap: wrap;
      align-items: center;
      gap: var(--aihio-spacing-control-gap);
    }

    @media (forced-colors: active) {
      aihio-card {
        border-color: CanvasText;
      }
    }
  `,
};
