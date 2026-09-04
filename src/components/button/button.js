import { AihioElement } from '../base.js';

/* Every rule is written for two shapes.

   After upgrade the box is drawn on the inner <button>, which is the element
   that actually carries the semantics. Before upgrade it is drawn on the host,
   because server-rendered markup is live HTML long before this module runs and
   a button that renders as unstyled text until hydration is worse than one
   that cannot be pressed yet. `box()` writes both selectors for one rule; the
   upgraded host stops drawing entirely (display: contents), so the two shapes
   never paint at the same time. */
const box = (attrs = '', state = '') => `aihio-button:not(:defined)${attrs}${state},
    aihio-button${attrs} > button${state}`;

export class AihioButton extends AihioElement {
  static tag = 'aihio-button';
  static schemaVersion = '1.3.0';
  static observedAttributes = [
    'variant',
    'size',
    'disabled',
    'loading',
    'type',
    'name',
    'value',
    'form',
    'formaction',
    'formmethod',
    'formenctype',
    'formnovalidate',
    'formtarget',
    'tabindex',
    'aria-label',
    'aria-labelledby',
    'aria-describedby',
    'aria-expanded',
    'aria-haspopup',
    'aria-controls',
    'aria-busy',
  ];
  static styles = `
    aihio-button:defined {
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
      height: var(--button-height-md);
      margin: 0;
      padding-inline: var(--button-padding-x-md);
      border: 1px solid transparent;
      appearance: none;
      cursor: pointer;
      transition: background-color var(--duration-intent-feedback) ease,
                  color var(--duration-intent-feedback) ease,
                  border-color var(--duration-intent-feedback) ease,
                  opacity var(--duration-intent-feedback) ease;
      user-select: none;
      text-decoration: none;
      line-height: var(--lineHeight-intent-compact);
    }

    /* Variants */
    ${box(':not([variant])')},
    ${box('[variant="default"]')} {
      background-color: oklch(var(--color-intent-action-primary-bg));
      color: oklch(var(--color-intent-action-primary-fg));
    }
    ${box(':not([variant])', ':hover')},
    ${box('[variant="default"]', ':hover')} {
      background-color: oklch(var(--color-intent-action-primary-bg) / 0.9);
    }

    ${box('[variant="secondary"]')} {
      background-color: oklch(var(--color-intent-action-secondary-bg));
      color: oklch(var(--color-intent-action-secondary-fg));
    }
    ${box('[variant="secondary"]', ':hover')} {
      background-color: oklch(var(--color-intent-action-secondary-bg) / 0.8);
    }

    ${box('[variant="outline"]')} {
      background-color: transparent;
      color: oklch(var(--color-intent-page-fg));
      border-color: oklch(var(--color-intent-border-subtle));
    }
    ${box('[variant="outline"]', ':hover')} {
      background-color: oklch(var(--color-intent-action-accent-bg));
      color: oklch(var(--color-intent-action-accent-fg));
    }

    ${box('[variant="ghost"]')} {
      background-color: transparent;
      color: oklch(var(--color-intent-page-fg));
    }
    ${box('[variant="ghost"]', ':hover')} {
      background-color: oklch(var(--color-intent-action-accent-bg));
      color: oklch(var(--color-intent-action-accent-fg));
    }

    ${box('[variant="link"]')} {
      background-color: transparent;
      color: oklch(var(--color-intent-action-primary-bg));
      text-decoration: underline;
      text-underline-offset: 4px;
      height: auto;
      padding-inline: 0;
    }
    ${box('[variant="link"]', ':hover')} {
      text-underline-offset: 2px;
    }

    ${box('[variant="destructive"]')} {
      background-color: oklch(var(--color-intent-state-destructive-bg));
      color: oklch(var(--color-intent-state-destructive-fg));
    }
    ${box('[variant="destructive"]', ':hover')} {
      background-color: oklch(var(--color-intent-state-destructive-bg) / 0.9);
    }

    /* Sizes */
    ${box('[size="sm"]')} {
      height: var(--button-height-sm);
      padding-inline: var(--button-padding-x-sm);
      font-size: var(--fontSize-intent-control-sm);
      border-radius: var(--radius-intent-interactive-compact);
    }
    ${box('[size="lg"]')} {
      height: var(--button-height-lg);
      padding-inline: var(--button-padding-x-lg);
      font-size: var(--fontSize-intent-control-lg);
      border-radius: var(--radius-intent-interactive);
    }
    ${box('[size="icon"]')} {
      height: var(--button-height-icon);
      width: var(--button-height-icon);
      padding: 0;
    }

    /* States. The upgraded shape keys off :disabled rather than the host
       attribute, because <fieldset disabled> disables the control natively and
       never touches the host. */
    aihio-button:not(:defined)[disabled],
    aihio-button > button:disabled {
      pointer-events: none;
      opacity: 0.5;
    }

    /* Loading is disabled too, but it reads as busy rather than unavailable,
       so it keeps full opacity unless it is also explicitly disabled. */
    aihio-button:not(:defined)[loading],
    aihio-button[loading]:not([disabled]) > button {
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
      border-radius: var(--radius-intent-pill);
      border: 2px solid currentColor;
      border-block-start-color: transparent;
      animation: aihio-button-spin var(--duration-intent-spinner) linear infinite;
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
      outline: 2px solid oklch(var(--color-intent-focus-ring));
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
      aihio-button > button:disabled {
        color: GrayText;
        border-color: GrayText;
        opacity: 1;
      }

      ${box('', ':focus-visible')} {
        outline-color: Highlight;
      }
    }
  `;

  setup() {
    // The control is a real <button> in the author's light DOM, which means
    // that inside their <form> it is an ordinary submit button. That is what
    // buys implicit submission (Enter in a field), SubmitEvent.submitter,
    // <fieldset disabled>, Enter and Space, the forced-colours mapping, and
    // the disabled semantics — none of which a role="button" custom element
    // reproduces, however much of it you hand-write.
    const authoredButton = this.querySelector(':scope > button');
    this._createdButton = !authoredButton;
    this._button = authoredButton ?? document.createElement('button');
    this._authoredAttributes = new Map(
      BUTTON_ATTRIBUTES
        .filter((name) => this._button.hasAttribute(name))
        .map((name) => [name, this._button.getAttribute(name)])
    );
    this._authoredAria = new Map(
      [...this._button.attributes]
        .filter(({ name }) => name.startsWith('aria-'))
        .map(({ name, value }) => [name, value])
    );
    this._authoredTabIndex = this._button.getAttribute('tabindex');
    this._authoredDisabled = this._button.hasAttribute('disabled');
    this._forwardedAria = new Set();
    this._forwardedAttributes = new Set();
    this._ownsTabIndex = false;

    // A <button> the author wrote keeps its own type when the host does not
    // state one, so <aihio-button><button type="submit">…</button></aihio-button>
    // — the shape to render when a framework should own the whole subtree —
    // behaves as written.
    this._defaultType = normalizeType(this._button.getAttribute('type'), 'button');

    // Virtual DOM renderers may replace host children during an update. Keep
    // the delegated control in place and move only those new direct children
    // into it; the renderer still owns and updates the same child nodes.
    this._adoptObserver = new MutationObserver(() => this._adopt());

    this._adopt();

    // A custom element is upgraded at its start tag, so if this module has
    // already run when the parser reaches the markup, the label is still being
    // parsed and lands after the control instead of inside it. Deferred module
    // loading makes that rare; one re-adopt at the end of parsing makes it
    // impossible. Nothing is moved after that point.
    if (typeof document !== 'undefined' && document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this._adopt(), { once: true });
    }
  }

  connect() {
    this._adoptObserver?.observe(this, { childList: true });
    this._adopt();
  }

  disconnect() {
    this._adoptObserver?.disconnect();
  }

  /** Move the label into the control, and the control into the host. */
  _adopt() {
    const controlWasRemoved = this._button.parentNode !== this;
    const strays = [...this.childNodes].filter((node) => node !== this._button);
    if (strays.length > 0) {
      // React and Vue update bare custom-element text by replacing all of the
      // host's children. That also removes our generated control. In that one
      // shape the new nodes replace the old label instead of being appended to
      // it; ordinary direct-child additions remain additive.
      if (this._createdButton && controlWasRemoved && this._button.hasChildNodes()) {
        this._button.replaceChildren(...strays);
      } else {
        this._button.append(...strays);
      }
    }

    if (this._button.parentNode !== this) {
      this.append(this._button);
    }
  }

  sync() {
    const button = this._button;
    if (!button) return;

    button.type = this.type;
    button.disabled = this._isDisabledLike();

    const forwardedAttributes = new Set();
    for (const name of BUTTON_ATTRIBUTES) {
      const value = this.getAttribute(name);
      if (value === null) continue;
      forwardedAttributes.add(name);
      if (button.getAttribute(name) !== value) button.setAttribute(name, value);
    }
    for (const name of this._forwardedAttributes) {
      if (forwardedAttributes.has(name)) continue;
      restoreAttribute(button, name, this._authoredAttributes);
    }
    this._forwardedAttributes = forwardedAttributes;

    // aria-* stays authored on the host — that is where the schema, the docs
    // and the linter all tell people to put it — and is mirrored onto the
    // control, which is the element that has the role. Only what was mirrored
    // is ever cleared, so an authored control keeps its own attributes.
    const forwarded = new Set();
    for (const { name, value } of this.attributes) {
      if (!name.startsWith('aria-')) continue;
      forwarded.add(name);
      if (button.getAttribute(name) !== value) {
        button.setAttribute(name, value);
      }
    }
    for (const name of this._forwardedAria) {
      if (forwarded.has(name)) continue;
      restoreAttribute(button, name, this._authoredAria);
    }
    this._forwardedAria = forwarded;

    if (this.boolAttr('loading')) {
      button.setAttribute('aria-busy', 'true');
    } else if (!this.hasAttribute('aria-busy')) {
      restoreAttribute(button, 'aria-busy', this._authoredAria);
    }

    // The host generates no box once upgraded, so a tabindex on it is inert;
    // the tab stop is the control.
    const tabIndex = this.getAttribute('tabindex');
    if (tabIndex !== null) {
      button.setAttribute('tabindex', tabIndex);
      this._ownsTabIndex = true;
    } else if (this._ownsTabIndex) {
      if (this._authoredTabIndex === null) button.removeAttribute('tabindex');
      else button.setAttribute('tabindex', this._authoredTabIndex);
      this._ownsTabIndex = false;
    }
  }

  _isDisabledLike() {
    return this._authoredDisabled || this.boolAttr('disabled') || this.boolAttr('loading');
  }

  /** The native <button> this element delegates to. */
  get control() {
    return this._button ?? null;
  }

  /** The form this button belongs to, or null when it is outside one. */
  get form() {
    return this._button?.form ?? null;
  }

  get type() {
    return normalizeType(this.getAttribute('type'), this._defaultType ?? 'button');
  }

  set type(value) {
    this.setAttribute('type', String(value));
  }

  click() {
    if (this._button) {
      this._button.click();
      return;
    }

    super.click();
  }

  focus(options) {
    if (this._button) {
      this._button.focus(options);
      return;
    }

    super.focus(options);
  }

  blur() {
    if (this._button) {
      this._button.blur();
      return;
    }

    super.blur();
  }
}

const BUTTON_ATTRIBUTES = [
  'name',
  'value',
  'form',
  'formaction',
  'formmethod',
  'formenctype',
  'formnovalidate',
  'formtarget',
];

function normalizeType(value, fallback) {
  return value === 'submit' || value === 'reset' || value === 'button' ? value : fallback;
}

function restoreAttribute(element, name, authored) {
  if (authored.has(name)) element.setAttribute(name, authored.get(name));
  else element.removeAttribute(name);
}
