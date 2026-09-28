import { AihioElement } from '../base.js';

export class AihioBadge extends AihioElement {
  static tag = 'aihio-badge';
  static schemaVersion = '1.1.0';
  static observedAttributes = ['variant'];
}
