import { AihioElement } from '../base.js';

export class AihioToggle extends AihioElement {
  static tag = 'aihio-toggle';
  static schemaVersion = '1.0.0';
  static observedAttributes = ['pressed', 'disabled', 'variant', 'size'];

  setup() {
    this._defaultTabIndex = this.getAttribute('tabindex') ?? '0';

    this._onClickCapture = (e) => {
      if (!this.boolAttr('disabled')) return;
      e.preventDefault();
      e.stopImmediatePropagation();
    };

    this._onClick = () => {
      if (this.hasAttribute('disabled')) return;
      const pressed = this.boolAttr('pressed');
      if (pressed) {
        this.removeAttribute('pressed');
      } else {
        this.setAttribute('pressed', '');
      }
      this.emit('aihio-toggle', { pressed: !pressed });
    };

    this._onKeyDown = (e) => {
      if (this.boolAttr('disabled')) return;
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        this.click();
      }
    };

    this.addEventListener('click', this._onClickCapture, { capture: true });
    this.addEventListener('click', this._onClick);
    this.addEventListener('keydown', this._onKeyDown);
  }

  sync() {
    const disabled = this.boolAttr('disabled');
    const tabIndex = Number.parseInt(this._defaultTabIndex ?? '0', 10);

    this.setAttribute('role', 'button');
    this.tabIndex = disabled ? -1 : Number.isNaN(tabIndex) ? 0 : tabIndex;
    this.setAria('pressed', String(this.boolAttr('pressed')));
    this.setAria('disabled', disabled ? 'true' : null);
  }
}
