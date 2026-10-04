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
      height: var(--aihio-input-height-md);
      border-radius: var(--aihio-radius-interactive);
      border: 1px solid var(--aihio-color-field-border);
      background-color: transparent;
      padding: var(--aihio-spacing-field-padding-block) var(--aihio-spacing-field-padding-inline);
      font-size: var(--aihio-font-size-control);
      line-height: var(--aihio-line-height-body);
      color: var(--aihio-color-page-fg);
      transition: border-color var(--aihio-duration-feedback) ease,
                  box-shadow var(--aihio-duration-feedback) ease;
    }

    aihio-input input::placeholder {
      color: var(--aihio-color-muted-fg);
    }

    aihio-input input:focus-visible {
      outline: none;
      border-color: var(--aihio-color-focus-ring);
      box-shadow: 0 0 0 1px var(--aihio-color-focus-ring);
    }

    aihio-input input:disabled {
      cursor: not-allowed;
      opacity: 0.5;
    }

    /* Sizes */
    aihio-input[size="sm"] input {
      height: var(--aihio-input-height-sm);
      font-size: var(--aihio-font-size-control-sm);
      padding: var(--aihio-spacing-field-padding-block-sm) var(--aihio-spacing-field-padding-inline-sm);
    }
    aihio-input[size="lg"] input {
      height: var(--aihio-input-height-lg);
      font-size: var(--aihio-font-size-control-lg);
      padding: var(--aihio-spacing-field-padding-block-lg) var(--aihio-spacing-field-padding-inline-lg);
    }

    /* Error state */
    aihio-input[error] input {
      border-color: var(--aihio-color-destructive-bg);
    }
    aihio-input[error] input:focus-visible {
      border-color: var(--aihio-color-destructive-bg);
      box-shadow: 0 0 0 1px var(--aihio-color-destructive-bg);
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
