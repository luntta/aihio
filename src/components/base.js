import { runDevHook } from './dev-hook.js';

const AihioHTMLElement = globalThis.HTMLElement ?? class {};
const shadowStyleSheets = new WeakMap();

export class AihioElement extends AihioHTMLElement {
  static observedAttributes = [];
  static styles = '';
  static tag = '';
  static shadow = false;

  constructor() {
    super();
    if (this.constructor.shadow) {
      this._initShadow();
    }
    this._didSetup = false;
  }

  _initShadow() {
    if (!this.shadowRoot && typeof this.attachShadow === 'function') {
      this.attachShadow({ mode: 'open' });
    }
  }

  _applyShadowStyles() {
    const shadow = this.shadowRoot;
    const ctor = this.constructor;
    if (!shadow || !ctor.styles) return;

    if (
      typeof CSSStyleSheet !== 'undefined' &&
      'adoptedStyleSheets' in shadow
    ) {
      let sheet = shadowStyleSheets.get(ctor);
      if (!sheet) {
        sheet = new CSSStyleSheet();
        sheet.replaceSync(ctor.styles);
        shadowStyleSheets.set(ctor, sheet);
      }
      shadow.adoptedStyleSheets = [sheet];
      return;
    }

    let style = shadow.querySelector('style[data-aihio-shadow]');
    if (!style) {
      style = document.createElement('style');
      style.setAttribute('data-aihio-shadow', ctor.tag);
      shadow.prepend(style);
    }
    style.textContent = ctor.styles;
  }

  _ensureSetup() {
    if (this._didSetup) return;
    this._didSetup = true;
    this.setup?.();
    if (this.constructor.shadow) {
      this._applyShadowStyles();
    }
  }

  /** Get attribute with fallback */
  attr(name, fallback) {
    return this.getAttribute(name) ?? fallback;
  }

  /** Get boolean attribute */
  boolAttr(name) {
    return this.hasAttribute(name);
  }

  /** Set boolean attribute */
  setBoolAttr(name, value) {
    this.toggleAttribute(name, Boolean(value));
  }

  /** Set aria attribute */
  setAria(name, value) {
    const attr = `aria-${name}`;
    if (value === null || value === undefined || value === false) {
      this.removeAttribute(attr);
      return;
    }
    this.setAttribute(attr, String(value));
  }

  /** Emit a custom event */
  emit(name, detail) {
    this.dispatchEvent(
      new CustomEvent(name, { detail, bubbles: true, composed: true })
    );
  }

  /** React to observed attribute changes */
  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue) return;
    if (!this.isConnected && !this._didSetup) return;
    this._ensureSetup();
    this.syncAttribute?.(name, oldValue, newValue);
    this.refresh();
  }

  connectedCallback() {
    this._ensureSetup();
    runDevHook(this, 'connect');
    this.refresh();
  }

  disconnectedCallback() {
    runDevHook(this, 'disconnect');
    this.teardown?.();
  }

  refresh() {
    this.sync?.();
    runDevHook(this, 'refresh');
  }

  /** Override in subclasses for one-time DOM setup */
  setup() {}

  /** Override in subclasses for repeated state syncing */
  sync() {}
}
