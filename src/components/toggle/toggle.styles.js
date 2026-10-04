// Light-DOM styles for aihio-toggle.
//
// They ship in aihio.css: src/css/build.js collects every *.styles.js.
// Nothing imports this module at runtime, so the CSS is not carried a
// second time inside the JavaScript bundles.

/* The same two shapes as aihio-button: drawn on the host before upgrade, and
   on the delegated <button> after it, when the host stops drawing
   (display: contents). */
const box = (attrs = '', state = '') => `aihio-toggle:not(:defined)${attrs}${state},
    aihio-toggle${attrs} > button${state}`;

export default {
  'aihio-toggle': `
    aihio-toggle:defined {
      display: contents;
    }

    ${box()} {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: var(--aihio-spacing-control-gap);
      white-space: nowrap;
      border-radius: var(--aihio-radius-interactive);
      font-family: inherit;
      font-size: var(--aihio-font-size-control);
      font-weight: var(--aihio-font-weight-control);
      line-height: var(--aihio-line-height-compact);
      height: var(--aihio-button-height-md);
      margin: 0;
      padding-inline: var(--aihio-button-padding-x-md);
      border: 1px solid transparent;
      appearance: none;
      cursor: pointer;
      user-select: none;
      background-color: transparent;
      color: var(--aihio-color-muted-fg);
      transition: background-color var(--aihio-duration-feedback) ease,
                  color var(--aihio-duration-feedback) ease;
    }

    ${box('', ':hover')} {
      background-color: var(--aihio-color-muted-bg);
      color: var(--aihio-color-muted-fg);
    }

    ${box('[pressed]')} {
      background-color: var(--aihio-color-control-highlight-bg);
      color: var(--aihio-color-control-highlight-fg);
    }

    ${box('[variant="outline"]')} {
      border-color: var(--aihio-color-border-subtle);
    }
    ${box('[variant="outline"][pressed]')} {
      background-color: var(--aihio-color-control-highlight-bg);
    }

    /* Sizes */
    ${box('[size="sm"]')} {
      height: var(--aihio-button-height-sm);
      padding-inline: var(--aihio-button-padding-x-sm);
    }
    ${box('[size="lg"]')} {
      height: var(--aihio-button-height-lg);
      padding-inline: var(--aihio-button-padding-x-lg);
    }

    /* :disabled rather than the host attribute, so <fieldset disabled> — which
       disables the control and never touches the host — is drawn too. */
    aihio-toggle:not(:defined)[disabled],
    aihio-toggle > button:disabled {
      pointer-events: none;
      opacity: 0.5;
    }

    ${box('', ':focus-visible')} {
      outline: 2px solid var(--aihio-color-focus-ring);
      outline-offset: 2px;
    }

    @media (forced-colors: active) {
      ${box()} {
        background-color: ButtonFace;
        color: ButtonText;
        border: 1px solid ButtonBorder;
      }

      /* Pressed is a selected state, and Highlight/HighlightText is the system
         pair for selection — without it the only cue is a background colour
         that forced colours discards. */
      ${box('[pressed]')} {
        background-color: Highlight;
        color: HighlightText;
        border-color: Highlight;
      }

      aihio-toggle:not(:defined)[disabled],
      aihio-toggle > button:disabled {
        color: GrayText;
        border-color: GrayText;
        opacity: 1;
      }

      ${box('', ':focus-visible')} {
        outline-color: Highlight;
      }
    }
  `,
};
