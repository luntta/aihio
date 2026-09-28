// Light-DOM styles for aihio-field.
//
// They ship in aihio.css: src/css/build.js collects every *.styles.js.
// Nothing imports this module at runtime, so the CSS is not carried a
// second time inside the JavaScript bundles.

export default {
  'aihio-field': `
    aihio-field {
      display: flex;
      flex-direction: column;
      gap: var(--spacing-intent-form-field-gap);
    }

    aihio-field [slot="label"] {
      font-size: var(--fontSize-intent-control-sm);
      font-weight: var(--fontWeight-intent-control);
      line-height: var(--lineHeight-intent-compact);
      color: oklch(var(--color-intent-page-fg));
    }

    aihio-field [slot="description"] {
      font-size: var(--fontSize-intent-body-sm);
      line-height: var(--lineHeight-intent-body);
      color: oklch(var(--color-intent-surface-muted-fg));
    }

    aihio-field [slot="error"] {
      font-size: var(--fontSize-intent-body-sm);
      line-height: var(--lineHeight-intent-body);
      color: oklch(var(--color-intent-state-destructive-text));
    }

    /* The description is redundant once an error is showing: the error message
       supersedes it, and stacking both buries the thing the user must act on. */
    aihio-field[error] [slot="description"] {
      display: none;
    }
  `,
};
