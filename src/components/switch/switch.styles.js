// Light-DOM styles for aihio-switch.
//
// They ship in aihio.css: src/css/build.js collects every *.styles.js.
// Nothing imports this module at runtime, so the CSS is not carried a
// second time inside the JavaScript bundles.

export default {
  'aihio-switch': `
    aihio-switch {
      --aihio-switch-width: 2.25rem;
      --aihio-switch-height: 1.25rem;
      --aihio-switch-inset: 2px;
      --aihio-switch-thumb: calc(var(--aihio-switch-height) - var(--aihio-switch-inset) * 2 - 2px);

      display: inline-flex;
      align-items: center;
      vertical-align: middle;
    }

    /* Hold the track's box before upgrade, so server-rendered markup does not
       jump when the checkbox appears. */
    aihio-switch:not(:defined) {
      width: var(--aihio-switch-width);
      height: var(--aihio-switch-height);
      border-radius: var(--aihio-radius-pill);
      background-color: var(--aihio-color-field-border);
    }

    /* The checkbox is the track and its ::before the thumb, so the element
       that has the role, the focus, and the checked state is the one drawn.
       The unchecked track uses the field border colour, which the contrast
       contract holds to 3:1 against the page: it is the only thing marking
       the control. */
    aihio-switch > input {
      appearance: none;
      position: relative;
      flex: none;
      box-sizing: border-box;
      width: var(--aihio-switch-width);
      height: var(--aihio-switch-height);
      margin: 0;
      border: 1px solid transparent;
      border-radius: var(--aihio-radius-pill);
      background-color: var(--aihio-color-field-border);
      cursor: pointer;
      transition: background-color var(--aihio-duration-feedback) ease;
    }

    aihio-switch > input::before {
      content: "";
      position: absolute;
      inset-block-start: var(--aihio-switch-inset);
      inset-inline-start: var(--aihio-switch-inset);
      width: var(--aihio-switch-thumb);
      height: var(--aihio-switch-thumb);
      border-radius: var(--aihio-radius-pill);
      background-color: var(--aihio-color-page-bg);
      box-shadow: var(--aihio-shadow-surface);
      transition: inset-inline-start var(--aihio-duration-feedback) ease;
    }

    aihio-switch > input:checked {
      background-color: var(--aihio-color-primary-action-bg);
    }

    aihio-switch > input:checked::before {
      inset-inline-start: calc(100% - var(--aihio-switch-thumb) - var(--aihio-switch-inset));
      background-color: var(--aihio-color-primary-action-fg);
    }

    aihio-switch > input:focus-visible {
      outline: 2px solid var(--aihio-color-focus-ring);
      outline-offset: 2px;
    }

    aihio-switch > input:disabled {
      cursor: not-allowed;
      opacity: 0.5;
    }

    /* On and off are fills, which forced colours discard. The track keeps a
       border, and the pair flips to Highlight/HighlightText when on — the
       system's colours for a selected state. The thumb's position still says
       which side it is on. */
    @media (forced-colors: active) {
      aihio-switch > input {
        border-color: ButtonText;
        background-color: ButtonFace;
      }

      aihio-switch > input::before {
        background-color: ButtonText;
      }

      aihio-switch > input:checked {
        border-color: Highlight;
        background-color: Highlight;
      }

      aihio-switch > input:checked::before {
        background-color: HighlightText;
      }

      aihio-switch > input:disabled {
        border-color: GrayText;
        opacity: 1;
      }

      aihio-switch > input:disabled::before {
        background-color: GrayText;
      }
    }
  `,
};
