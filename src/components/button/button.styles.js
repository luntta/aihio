// Light-DOM styles for aihio-button.
//
// They ship in aihio.css: src/css/build.js collects every *.styles.js.
// Nothing imports this module at runtime, so the CSS is not carried a
// second time inside the JavaScript bundles.

/* Every rule is written for two shapes.

   After upgrade the box is drawn on the inner control, which is the element
   that actually carries the semantics: the <button> the component renders, or
   a <button> or <a> the author wrote. Before upgrade it is drawn on the host,
   because server-rendered markup is live HTML long before this module runs and
   a button that renders as unstyled text until hydration is worse than one
   that cannot be pressed yet. An authored control needs no upgrade to work (a
   link navigates without any script), so it is drawn from the first paint and
   the host steps aside then too. `box()` writes every selector for one rule;
   a host that has stepped aside (display: contents) draws nothing, so two
   shapes never paint at the same time.

   :has() sits inside :is(), whose selector list is forgiving: an engine
   without :has() drops that part and keeps the rest of the rule, so it falls
   back to drawing on the host before upgrade. */
const AUTHORED_CONTROL = ':is(:has(> button), :has(> a))';
const box = (attrs = '', state = '') => `aihio-button:not(:defined):not(${AUTHORED_CONTROL})${attrs}${state},
    aihio-button${attrs} > button${state},
    aihio-button${attrs} > a${state}`;

export default {
  'aihio-button': `
    aihio-button:defined,
    aihio-button${AUTHORED_CONTROL} {
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
      height: var(--aihio-button-height-md);
      margin: 0;
      padding-inline: var(--aihio-button-padding-x-md);
      border: 1px solid transparent;
      appearance: none;
      cursor: pointer;
      transition: background-color var(--aihio-duration-feedback) ease,
                  color var(--aihio-duration-feedback) ease,
                  border-color var(--aihio-duration-feedback) ease,
                  opacity var(--aihio-duration-feedback) ease;
      user-select: none;
      text-decoration: none;
      line-height: var(--aihio-line-height-compact);
    }

    /* Variants */
    ${box(':not([variant])')},
    ${box('[variant="default"]')} {
      background-color: var(--aihio-color-primary-action-bg);
      color: var(--aihio-color-primary-action-fg);
    }
    ${box(':not([variant])', ':hover')},
    ${box('[variant="default"]', ':hover')} {
      background-color: color-mix(in oklch, var(--aihio-color-primary-action-bg) 90%, transparent);
    }

    ${box('[variant="secondary"]')} {
      background-color: var(--aihio-color-secondary-action-bg);
      color: var(--aihio-color-secondary-action-fg);
    }
    ${box('[variant="secondary"]', ':hover')} {
      background-color: color-mix(in oklch, var(--aihio-color-secondary-action-bg) 80%, transparent);
    }

    ${box('[variant="outline"]')} {
      background-color: transparent;
      color: var(--aihio-color-page-fg);
      border-color: var(--aihio-color-border-subtle);
    }
    ${box('[variant="outline"]', ':hover')} {
      background-color: var(--aihio-color-control-highlight-bg);
      color: var(--aihio-color-control-highlight-fg);
    }

    ${box('[variant="ghost"]')} {
      background-color: transparent;
      color: var(--aihio-color-page-fg);
    }
    ${box('[variant="ghost"]', ':hover')} {
      background-color: var(--aihio-color-control-highlight-bg);
      color: var(--aihio-color-control-highlight-fg);
    }

    ${box('[variant="link"]')} {
      background-color: transparent;
      color: var(--aihio-color-primary-action-bg);
      text-decoration: underline;
      text-underline-offset: 4px;
      height: auto;
      padding-inline: 0;
    }
    ${box('[variant="link"]', ':hover')} {
      text-underline-offset: 2px;
    }

    ${box('[variant="destructive"]')} {
      background-color: var(--aihio-color-destructive-bg);
      color: var(--aihio-color-destructive-fg);
    }
    ${box('[variant="destructive"]', ':hover')} {
      background-color: color-mix(in oklch, var(--aihio-color-destructive-bg) 90%, transparent);
    }

    /* Sizes */
    ${box('[size="sm"]')} {
      height: var(--aihio-button-height-sm);
      padding-inline: var(--aihio-button-padding-x-sm);
      font-size: var(--aihio-font-size-control-sm);
      border-radius: var(--aihio-radius-interactive-compact);
    }
    ${box('[size="lg"]')} {
      height: var(--aihio-button-height-lg);
      padding-inline: var(--aihio-button-padding-x-lg);
      font-size: var(--aihio-font-size-control-lg);
      border-radius: var(--aihio-radius-interactive);
    }
    ${box('[size="icon"]')} {
      height: var(--aihio-button-height-icon);
      width: var(--aihio-button-height-icon);
      padding: 0;
    }

    /* States. The upgraded shape keys off :disabled rather than the host
       attribute, because <fieldset disabled> disables the control natively and
       never touches the host. */
    aihio-button:not(:defined)[disabled],
    aihio-button > button:disabled,
    aihio-button[disabled] > a,
    aihio-button > a[aria-disabled="true"] {
      pointer-events: none;
      opacity: 0.5;
    }

    /* Loading is disabled too, but it reads as busy rather than unavailable,
       so it keeps full opacity unless it is also explicitly disabled. */
    aihio-button:not(:defined)[loading],
    aihio-button[loading]:not([disabled]) > button,
    aihio-button[loading]:not([disabled]) > a {
      pointer-events: none;
      opacity: 1;
    }

    /* A loading button has to look different, not just behave differently.
       aria-busy covers assistive tech; this covers everyone else. */
    ${box('[loading]', '::before')} {
      content: "";
      width: 1em;
      height: 1em;
      flex: none;
      border-radius: var(--aihio-radius-pill);
      border: 2px solid currentColor;
      border-block-start-color: transparent;
      animation: aihio-button-spin var(--aihio-duration-spinner) linear infinite;
    }

    @keyframes aihio-button-spin {
      to { transform: rotate(1turn); }
    }

    @media (prefers-reduced-motion: reduce) {
      ${box('[loading]', '::before')} {
        animation: none;
        border-block-start-color: currentColor;
        opacity: 0.5;
      }
    }

    ${box('', ':focus-visible')} {
      outline: 2px solid var(--aihio-color-focus-ring);
      outline-offset: 2px;
    }

    /* Forced colours override background and colour, so a control styled only
       with a fill becomes invisible. System colour keywords are honoured
       inside this query, and the disabled opacity is dropped because GrayText
       is the signal HCM users actually read. */
    @media (forced-colors: active) {
      ${box()} {
        background-color: ButtonFace;
        color: ButtonText;
        border-color: ButtonBorder;
      }

      ${box('', ':hover')} {
        background-color: ButtonFace;
        color: ButtonText;
      }

      ${box('[variant="link"]')} {
        background-color: transparent;
        color: LinkText;
        border-color: transparent;
      }

      aihio-button:not(:defined)[disabled],
      aihio-button:not(:defined)[loading],
      aihio-button > button:disabled,
      aihio-button[disabled] > a,
      aihio-button > a[aria-disabled="true"] {
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
