import { AihioElement } from '../base.js';

export class AihioCard extends AihioElement {
  static tag = 'aihio-card';
  static schemaVersion = '1.0.0';
  static observedAttributes = ['variant'];
}

export class AihioCardHeader extends AihioElement {
  static tag = 'aihio-card-header';
}

export class AihioCardTitle extends AihioElement {
  static tag = 'aihio-card-title';
}

export class AihioCardDescription extends AihioElement {
  static tag = 'aihio-card-description';
}

export class AihioCardContent extends AihioElement {
  static tag = 'aihio-card-content';
}

export class AihioCardFooter extends AihioElement {
  static tag = 'aihio-card-footer';
}
