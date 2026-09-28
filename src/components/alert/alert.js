import { AihioElement } from '../base.js';

export class AihioAlert extends AihioElement {
  static tag = 'aihio-alert';
  static schemaVersion = '1.1.0';
  static observedAttributes = ['variant'];

  sync() {
    if (this._authoredRole === undefined) {
      this._authoredRole = this.getAttribute('role');
    }

    if (this._authoredRole !== null) return;

    // role="alert" is an assertive live region: it interrupts whatever the
    // screen reader is saying. That is right for a failure and wrong for a
    // confirmation, so only the destructive variant gets it.
    const assertive = this.attr('variant', 'default') === 'destructive';
    this.setAttribute('role', assertive ? 'alert' : 'status');
  }
}
