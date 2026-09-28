import { AihioElement } from '../base.js';

export class AihioAvatar extends AihioElement {
  static tag = 'aihio-avatar';
  static schemaVersion = '1.0.0';
  static observedAttributes = ['src', 'alt', 'fallback', 'size'];

  setup() {
    this._hasImageError = false;
    this._img = document.createElement('img');

    this._img.addEventListener('error', () => {
      this._hasImageError = true;
      this.refresh();
    });

    this._img.addEventListener('load', () => {
      this._hasImageError = false;
    });
  }

  syncAttribute(name) {
    if (name === 'src') {
      this._hasImageError = false;
    }
  }

  sync() {
    const src = this.attr('src', '').trim();
    const alt = this.attr('alt', '');
    const fallback = this.attr('fallback', '');

    if (src && !this._hasImageError) {
      if (this._img.alt !== alt) this._img.alt = alt;
      if (this._img.getAttribute('src') !== src) this._img.src = src;
      if (this.firstChild !== this._img || this.childNodes.length !== 1) {
        this.replaceChildren(this._img);
      }
      return;
    }

    this._renderFallback(fallback, alt);
  }

  _renderFallback(fallback, alt) {
    const text = fallback || this._initialsFromAlt(alt);
    if (this.textContent !== text || this.childNodes.length !== 1 || this.firstChild === this._img) {
      this.replaceChildren(document.createTextNode(text));
    }
  }

  _initialsFromAlt(alt) {
    if (!alt) return '';
    return alt
      .split(/\s+/)
      .filter(Boolean)
      .map((word) => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }
}
