// Light-DOM styles for aihio-toggle.
//
// They ship in aihio.css: src/css/build.js collects every *.styles.js.
// Nothing imports this module at runtime, so the CSS is not carried a
// second time inside the JavaScript bundles.

export default {
  'aihio-toggle': `
    aihio-toggle {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: var(--spacing-intent-control-gap);
      border-radius: var(--radius-intent-interactive);
      font-size: var(--fontSize-intent-control);
      font-weight: var(--fontWeight-intent-control);
      height: var(--button-height-md);
      padding-inline: var(--button-padding-x-md);
      border: 1px solid transparent;
      cursor: pointer;
      user-select: none;
      background-color: transparent;
      color: oklch(var(--color-intent-surface-muted-fg));
      transition: background-color var(--duration-intent-feedback) ease,
                  color var(--duration-intent-feedback) ease;
    }

    aihio-toggle:hover {
      background-color: oklch(var(--color-intent-surface-muted-bg));
      color: oklch(var(--color-intent-surface-muted-fg));
    }

    aihio-toggle[pressed] {
      background-color: oklch(var(--color-intent-action-accent-bg));
      color: oklch(var(--color-intent-action-accent-fg));
    }

    aihio-toggle[variant="outline"] {
      border-color: oklch(var(--color-intent-border-subtle));
    }
    aihio-toggle[variant="outline"][pressed] {
      background-color: oklch(var(--color-intent-action-accent-bg));
    }

    /* Sizes */
    aihio-toggle[size="sm"] {
      height: var(--button-height-sm);
      padding-inline: var(--button-padding-x-sm);
    }
    aihio-toggle[size="lg"] {
      height: var(--button-height-lg);
      padding-inline: var(--button-padding-x-lg);
    }

    aihio-toggle[disabled] {
      pointer-events: none;
      opacity: 0.5;
    }

    aihio-toggle:focus-visible {
      outline: 2px solid oklch(var(--color-intent-focus-ring));
      outline-offset: 2px;
    }

    @media (forced-colors: active) {
      aihio-toggle {
        background-color: ButtonFace;
        color: ButtonText;
        border: 1px solid ButtonBorder;
      }

      /* Pressed is a selected state, and Highlight/HighlightText is the system
         pair for selection — without it the only cue is a background colour
         that forced colours discards. */
      aihio-toggle[pressed] {
        background-color: Highlight;
        color: HighlightText;
        border-color: Highlight;
      }

      aihio-toggle[disabled] {
        color: GrayText;
        border-color: GrayText;
        opacity: 1;
      }

      aihio-toggle:focus-visible {
        outline-color: Highlight;
      }
    }
  `,
};
