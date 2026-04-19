import { AihioElement } from '../base.js';

let tabsInstanceId = 0;

export class AihioTabs extends AihioElement {
  static tag = 'aihio-tabs';
  static shadow = true;
  static observedAttributes = ['value'];
  static styles = `
    :host {
      display: flex;
      flex-direction: column;
    }
  `;

  setup() {
    this._tabsId = ++tabsInstanceId;
    this.shadowRoot.innerHTML = '<slot></slot>';

    this._slot = this.shadowRoot.querySelector('slot');
    this._onSlotChange = () => this.refresh();
    this._slot.addEventListener('slotchange', this._onSlotChange);

    this._onTabSelect = (e) => {
      if (e.target === this) return;
      const nextValue = e.detail?.value ?? '';
      if (nextValue !== this.getAttribute('value')) {
        this.setAttribute('value', nextValue);
      } else {
        this.refresh();
      }
    };

    this.addEventListener('tab-select', this._onTabSelect);

    this._observer = new MutationObserver((records) => {
      if (records.some((record) => record.target !== this)) {
        this.refresh();
      }
    });

    this._observer.observe(this, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['value', 'disabled', 'id'],
    });
  }

  teardown() {
    this.removeEventListener('tab-select', this._onTabSelect);
    this._slot?.removeEventListener('slotchange', this._onSlotChange);
    this._observer?.disconnect();
  }

  sync() {
    const tabs = [...this.querySelectorAll('aihio-tab')];
    const panels = [...this.querySelectorAll('aihio-tab-panel')];
    if (tabs.length === 0) return;

    const enabledTabs = tabs.filter((tab) => !tab.hasAttribute('disabled'));
    let value = this.attr('value', '');

    if (!enabledTabs.some((tab) => tab.getAttribute('value') === value)) {
      value = (enabledTabs[0] ?? tabs[0]).getAttribute('value') ?? '';
      if (value !== this.getAttribute('value')) {
        this.setAttribute('value', value);
        return;
      }
    }

    tabs.forEach((tab, index) => {
      const tabValue = tab.getAttribute('value') ?? '';
      const isActive = tabValue === value && !tab.hasAttribute('disabled');

      if (!tab.id) tab.id = `aihio-tabs-${this._tabsId}-tab-${index + 1}`;
      const panel = panels.find((candidate) => candidate.getAttribute('value') === tabValue);
      if (panel && !panel.id) panel.id = `aihio-tabs-${this._tabsId}-panel-${index + 1}`;

      tab.toggleAttribute('active', isActive);
      tab.setAttribute('aria-selected', String(isActive));
      if (panel) tab.setAttribute('aria-controls', panel.id);
      else tab.removeAttribute('aria-controls');
      tab.setAttribute('tabindex', isActive ? '0' : '-1');
    });

    panels.forEach((panel) => {
      const panelValue = panel.getAttribute('value') ?? '';
      const tab = tabs.find((candidate) => candidate.getAttribute('value') === panelValue);
      const isActive = panelValue === value && Boolean(tab) && !tab.hasAttribute('disabled');

      panel.toggleAttribute('active', isActive);
      panel.hidden = !isActive;

      if (tab) panel.setAttribute('aria-labelledby', tab.id);
      else panel.removeAttribute('aria-labelledby');
    });
  }
}

export class AihioTabList extends AihioElement {
  static tag = 'aihio-tab-list';
  static styles = `
    aihio-tab-list {
      display: inline-flex;
      align-items: center;
      gap: var(--spacing-intent-cluster-gap-tight);
      border-radius: var(--radius-intent-interactive);
      background-color: oklch(var(--color-intent-surface-muted-bg));
      padding: var(--spacing-intent-cluster-gap-tight);
    }
  `;

  setup() {
    this._onKeyDown = (e) => {
      const tabs = [...this.querySelectorAll('aihio-tab:not([disabled])')];
      if (tabs.length === 0) return;

      const current = tabs.findIndex((tab) => tab.hasAttribute('active'));
      let next = -1;

      if (e.key === 'ArrowRight') next = (current + 1 + tabs.length) % tabs.length;
      else if (e.key === 'ArrowLeft') next = (current - 1 + tabs.length) % tabs.length;
      else if (e.key === 'Home') next = 0;
      else if (e.key === 'End') next = tabs.length - 1;
      else return;

      e.preventDefault();
      tabs[next]?.click();
      tabs[next]?.focus();
    };

    this.addEventListener('keydown', this._onKeyDown);
  }

  teardown() {
    this.removeEventListener('keydown', this._onKeyDown);
  }

  sync() {
    this.setAttribute('role', 'tablist');
  }
}

export class AihioTab extends AihioElement {
  static tag = 'aihio-tab';
  static observedAttributes = ['value', 'active', 'disabled'];
  static styles = `
    aihio-tab {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      white-space: nowrap;
      border-radius: var(--radius-intent-interactive-compact);
      padding: var(--spacing-intent-stack-tight) var(--spacing-intent-field-padding-inline);
      font-size: var(--fontSize-intent-control);
      font-weight: var(--fontWeight-intent-control);
      color: oklch(var(--color-intent-surface-muted-fg));
      cursor: pointer;
      user-select: none;
      transition: background-color var(--duration-intent-feedback) ease,
                  color var(--duration-intent-feedback) ease,
                  box-shadow var(--duration-intent-feedback) ease;
    }

    aihio-tab:hover:not([disabled]) {
      color: oklch(var(--color-intent-page-fg));
    }

    aihio-tab[active] {
      background-color: oklch(var(--color-intent-page-bg));
      color: oklch(var(--color-intent-page-fg));
      box-shadow: var(--shadow-intent-surface);
    }

    aihio-tab[disabled] {
      pointer-events: none;
      opacity: 0.5;
    }

    aihio-tab:focus-visible {
      outline: 2px solid oklch(var(--color-intent-focus-ring));
      outline-offset: 2px;
    }
  `;

  setup() {
    this._onClick = () => {
      if (this.hasAttribute('disabled')) return;
      this.emit('tab-select', { value: this.attr('value', '') });
    };

    this._onKeyDown = (e) => {
      if (this.hasAttribute('disabled')) return;
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        this.click();
      }
    };

    this.addEventListener('click', this._onClick);
    this.addEventListener('keydown', this._onKeyDown);
  }

  teardown() {
    this.removeEventListener('click', this._onClick);
    this.removeEventListener('keydown', this._onKeyDown);
  }

  sync() {
    this.setAttribute('role', 'tab');
    this.setAria('disabled', this.boolAttr('disabled') ? 'true' : null);
  }
}

export class AihioTabPanel extends AihioElement {
  static tag = 'aihio-tab-panel';
  static observedAttributes = ['value', 'active'];
  static styles = `
    aihio-tab-panel {
      display: none;
      padding-top: var(--spacing-intent-stack-sm);
    }
    aihio-tab-panel[active] {
      display: block;
    }
  `;

  sync() {
    this.setAttribute('role', 'tabpanel');
    this.hidden = !this.boolAttr('active');
  }
}
