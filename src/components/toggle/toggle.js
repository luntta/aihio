import { AihioButton } from '../button/button.js';

/**
 * A pressed/unpressed button. It is an aihio-button underneath — a real
 * <button> with aria-pressed — so activation, focus, disabled semantics, and
 * the forced-colours mapping are the platform's, not an emulation of them.
 */
export class AihioToggle extends AihioButton {
  static tag = 'aihio-toggle';
  static schemaVersion = '2.0.0';
  static observedAttributes = [...AihioButton.observedAttributes, 'pressed'];

  setup() {
    super.setup();

    // A disabled <button> dispatches no click, so there is nothing to
    // suppress; the check covers a click dispatched at the host directly.
    this._onToggleClick = (event) => {
      if (!event.composedPath().includes(this._button) || this._button.disabled) return;
      this.pressed = !this.pressed;
      this.emit('aihio-toggle', { pressed: this.pressed });
    };
    this.addEventListener('click', this._onToggleClick);
  }

  sync() {
    super.sync();
    this._button?.setAttribute('aria-pressed', String(this.pressed));
  }

  /** A toggle never submits or resets a form, whatever its type says. */
  get type() {
    return 'button';
  }

  set type(_value) {}

  get pressed() {
    return this.hasAttribute('pressed');
  }

  set pressed(value) {
    this.toggleAttribute('pressed', Boolean(value));
  }
}
