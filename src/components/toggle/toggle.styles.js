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
      gap: var(--spacing-intent-control-gap);
      white-space: nowrap;
      border-radius: var(--radius-intent-interactive);
      font-family: inherit;
      font-size: var(--fontSize-intent-control);
      font-weight: var(--fontWeight-intent-control);
      line-height: var(--lineHeight-intent-compact);
      height: var(--button-height-md);
      margin: 0;
      padding-inline: var(--button-padding-x-md);
      border: 1px solid transparent;
      appearance: none;
      cursor: pointer;
      user-select: none;
      background-color: transparent;
      color: oklch(var(--color-intent-surface-muted-fg));
      transition: background-color var(--duration-intent-feedback) ease,
                  color var(--duration-intent-feedback) ease;
    }

    ${box('', ':hover')} {
      background-color: oklch(var(--color-intent-surface-muted-bg));
      color: oklch(var(--color-intent-surface-muted-fg));
    }

    ${box('[pressed]')} {
      background-color: oklch(var(--color-intent-action-accent-bg));
      color: oklch(var(--color-intent-action-accent-fg));
    }

    ${box('[variant="outline"]')} {
      border-color: oklch(var(--color-intent-border-subtle));
    }
    ${box('[variant="outline"][pressed]')} {
      background-color: oklch(var(--color-intent-action-accent-bg));
    }

    /* Sizes */
    ${box('[size="sm"]')} {
      height: var(--button-height-sm);
      padding-inline: var(--button-padding-x-sm);
    }
    ${box('[size="lg"]')} {
      height: var(--button-height-lg);
      padding-inline: var(--button-padding-x-lg);
    }

    /* :disabled rather than the host attribute, so <fieldset disabled> — which
       disables the control and never touches the host — is drawn too. */
    aihio-toggle:not(:defined)[disabled],
    aihio-toggle > button:disabled {
      pointer-events: none;
      opacity: 0.5;
    }

    ${box('', ':focus-visible')} {
      outline: 2px solid oklch(var(--color-intent-focus-ring));
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
