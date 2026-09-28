// Light-DOM styles for aihio-input.
//
// They ship in aihio.css: src/css/build.js collects every *.styles.js.
// Nothing imports this module at runtime, so the CSS is not carried a
// second time inside the JavaScript bundles.

export default {
  'aihio-input': `
    aihio-input {
      display: inline-flex;
      position: relative;
      width: 100%;
    }

    aihio-input input {
      display: flex;
      width: 100%;
      height: var(--input-height-md);
      border-radius: var(--radius-intent-interactive);
      border: 1px solid oklch(var(--color-intent-field-border));
      background-color: transparent;
      padding: var(--spacing-intent-field-padding-block) var(--spacing-intent-field-padding-inline);
      font-size: var(--fontSize-intent-control);
      line-height: var(--lineHeight-intent-body);
      color: oklch(var(--color-intent-page-fg));
      transition: border-color var(--duration-intent-feedback) ease,
                  box-shadow var(--duration-intent-feedback) ease;
    }

    aihio-input input::placeholder {
      color: oklch(var(--color-intent-surface-muted-fg));
    }

    aihio-input input:focus-visible {
      outline: none;
      border-color: oklch(var(--color-intent-focus-ring));
      box-shadow: 0 0 0 1px oklch(var(--color-intent-focus-ring));
    }

    aihio-input input:disabled {
      cursor: not-allowed;
      opacity: 0.5;
    }

    /* Sizes */
    aihio-input[size="sm"] input {
      height: var(--input-height-sm);
      font-size: var(--fontSize-intent-control-sm);
      padding: var(--spacing-intent-field-padding-block-sm) var(--spacing-intent-field-padding-inline-sm);
    }
    aihio-input[size="lg"] input {
      height: var(--input-height-lg);
      font-size: var(--fontSize-intent-control-lg);
      padding: var(--spacing-intent-field-padding-block-lg) var(--spacing-intent-field-padding-inline-lg);
    }

    /* Error state */
    aihio-input[error] input {
      border-color: oklch(var(--color-intent-state-destructive-bg));
    }
    aihio-input[error] input:focus-visible {
      border-color: oklch(var(--color-intent-state-destructive-bg));
      box-shadow: 0 0 0 1px oklch(var(--color-intent-state-destructive-bg));
    }

    @media (forced-colors: active) {
      aihio-input input {
        background-color: Field;
        color: FieldText;
        border-color: FieldText;
      }

      aihio-input input:focus-visible {
        outline: 2px solid Highlight;
        outline-offset: 2px;
        box-shadow: none;
      }

      aihio-input input:disabled {
        color: GrayText;
        border-color: GrayText;
        opacity: 1;
      }

      /* Colour cannot mark the error state here, so widen the border: a shape
         signal survives forced colours. The message text carries the rest. */
      aihio-input[error] input {
        border-width: 2px;
        border-color: FieldText;
      }
    }
  `,
};
