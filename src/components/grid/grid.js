import { AihioElement } from '../base.js';

export class AihioGrid extends AihioElement {
  static tag = 'aihio-grid';
  static schemaVersion = '1.0.0';
  static observedAttributes = ['columns', 'gap'];
}
