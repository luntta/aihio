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

    /* A switch reads as a sentence — "Email notifications", on — so its field
       is a row: the switch beside its label, and the description and error
       under the label. */
    aihio-field:has(> aihio-switch) {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      align-items: center;
      column-gap: var(--spacing-intent-stack-md);
      row-gap: var(--spacing-intent-form-field-gap);
    }

    aihio-field:has(> aihio-switch) > * {
      grid-column: 1;
    }

    aihio-field:has(> aihio-switch) > aihio-switch {
      grid-column: 2;
      grid-row: 1;
    }

    /* Native controls Aihio does not wrap. The field already wires their
       label, description, and error; inside it they are drawn to match
       aihio-input. */
    aihio-field > textarea,
    aihio-field > select {
      box-sizing: border-box;
      width: 100%;
      margin: 0;
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

    aihio-field > textarea {
      min-height: calc(var(--input-height-md) * 2);
      resize: vertical;
    }

    aihio-field > textarea::placeholder {
      color: oklch(var(--color-intent-surface-muted-fg));
    }

    /* The chevron is two gradient triangles in currentColor, so it follows the
       theme and forced colours without an image. */
    aihio-field > select {
      appearance: none;
      height: var(--input-height-md);
      padding-inline-end: calc(var(--spacing-intent-field-padding-inline) + 1.25rem);
      background-image:
        linear-gradient(45deg, transparent 50%, currentColor 50%),
        linear-gradient(135deg, currentColor 50%, transparent 50%);
      background-position:
        right calc(var(--spacing-intent-field-padding-inline) + 5px) center,
        right var(--spacing-intent-field-padding-inline) center;
      background-size: 5px 5px;
      background-repeat: no-repeat;
      cursor: pointer;
    }

    aihio-field > select:dir(rtl) {
      background-position:
        left var(--spacing-intent-field-padding-inline) center,
        left calc(var(--spacing-intent-field-padding-inline) + 5px) center;
    }

    aihio-field > textarea:focus-visible,
    aihio-field > select:focus-visible {
      outline: none;
      border-color: oklch(var(--color-intent-focus-ring));
      box-shadow: 0 0 0 1px oklch(var(--color-intent-focus-ring));
    }

    aihio-field[error] > textarea,
    aihio-field[error] > select {
      border-color: oklch(var(--color-intent-state-destructive-bg));
    }

    aihio-field[error] > textarea:focus-visible,
    aihio-field[error] > select:focus-visible {
      box-shadow: 0 0 0 1px oklch(var(--color-intent-state-destructive-bg));
    }

    aihio-field > textarea:disabled,
    aihio-field > select:disabled {
      cursor: not-allowed;
      opacity: 0.5;
    }

    @media (forced-colors: active) {
      aihio-field > textarea,
      aihio-field > select {
        background-color: Field;
        color: FieldText;
        border-color: FieldText;
      }

      aihio-field > textarea:focus-visible,
      aihio-field > select:focus-visible {
        outline: 2px solid Highlight;
        outline-offset: 2px;
        box-shadow: none;
      }

      aihio-field[error] > textarea,
      aihio-field[error] > select {
        border-width: 2px;
        border-color: FieldText;
      }

      aihio-field > textarea:disabled,
      aihio-field > select:disabled {
        color: GrayText;
        border-color: GrayText;
        opacity: 1;
      }
    }
  `,
};
