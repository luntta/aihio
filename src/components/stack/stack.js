import { AihioElement } from '../base.js';

export class AihioStack extends AihioElement {
  static tag = 'aihio-stack';
  static schemaVersion = '1.0.0';
  static observedAttributes = ['gap', 'align'];
}
