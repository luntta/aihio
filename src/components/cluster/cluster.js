import { AihioElement } from '../base.js';

export class AihioCluster extends AihioElement {
  static tag = 'aihio-cluster';
  static schemaVersion = '1.0.0';
  static observedAttributes = ['gap', 'align', 'justify', 'grow'];
}
