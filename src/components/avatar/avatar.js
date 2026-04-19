import { AihioElement } from '../base.js';

export class AihioAvatar extends AihioElement {
  static tag = 'aihio-avatar';
  static observedAttributes = ['src', 'alt', 'fallback', 'size'];
  static styles = `
    aihio-avatar {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: var(--avatar-size-md);
      height: var(--avatar-size-md);
      border-radius: var(--radius-intent-pill);
      overflow: hidden;
      background-color: oklch(var(--color-intent-surface-muted-bg));
      color: oklch(var(--color-intent-surface-muted-fg));
      font-size: var(--fontSize-intent-control);
      font-weight: var(--fontWeight-intent-control);
      flex-shrink: 0;
    }

    aihio-avatar[size="sm"] {
      width: var(--avatar-size-sm);
      height: var(--avatar-size-sm);
      font-size: var(--fontSize-intent-control-sm);
    }
    aihio-avatar[size="lg"] {
      width: var(--avatar-size-lg);
      height: var(--avatar-size-lg);
      font-size: var(--fontSize-intent-control-lg);
    }

    aihio-avatar img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
  `;

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
