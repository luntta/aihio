/**
 * How to draw a component for display, where the schema only says what it
 * accepts.
 *
 * `variants` lists the attributes whose values change how a component looks,
 * and how to draw it with one of those values; the values themselves come
 * from the schema, so a new variant appears here without an edit. `thumbnail`
 * is a small, representative rendering for the component index.
 *
 * Every snippet is live markup on a docs page outside an example preview, so
 * the docs check lints it like the rest of the site.
 */

const title = (value) => value.charAt(0).toUpperCase() + value.slice(1);
const boxes = (count) => Array.from({ length: count }, () => '<div class="docs-sample-box"></div>').join('');

const ALERT_COPY = {
  default: ['Heads up', 'Your workspace has a new member.'],
  destructive: ['Could not save', 'Check your connection and try again.'],
  success: ['Saved', 'Your changes are live.'],
  warning: ['Trial ends soon', 'Add a payment method to keep your workspace.'],
};

export default {
  'aihio-alert': {
    layout: 'stack',
    variants: {
      variant: (value) => {
        const [heading, body] = ALERT_COPY[value] ?? [title(value), ''];
        return `<aihio-alert variant="${value}"><div slot="title">${heading}</div><div slot="description">${body}</div></aihio-alert>`;
      },
    },
    thumbnail: '<aihio-alert variant="success"><div slot="title">Saved</div><div slot="description">Your changes are live.</div></aihio-alert>',
  },
  'aihio-avatar': {
    variants: {
      size: (value) => `<aihio-avatar size="${value}" fallback="JD" alt="Jane Doe"></aihio-avatar>`,
    },
    thumbnail: '<aihio-cluster><aihio-avatar fallback="AL" alt="Ada Lovelace"></aihio-avatar><aihio-avatar fallback="GH" alt="Grace Hopper"></aihio-avatar><aihio-avatar fallback="AT" alt="Alan Turing"></aihio-avatar></aihio-cluster>',
  },
  'aihio-badge': {
    variants: {
      variant: (value) => `<aihio-badge variant="${value}">${title(value)}</aihio-badge>`,
    },
    thumbnail: '<aihio-cluster gap="tight"><aihio-badge>New</aihio-badge><aihio-badge variant="success">Live</aihio-badge><aihio-badge variant="outline">Beta</aihio-badge></aihio-cluster>',
  },
  'aihio-button': {
    variants: {
      variant: (value) => `<aihio-button variant="${value}">${title(value)}</aihio-button>`,
      size: (value) => (value === 'icon'
        ? '<aihio-button size="icon" aria-label="Add">+</aihio-button>'
        : `<aihio-button size="${value}">Size ${value}</aihio-button>`),
    },
    thumbnail: '<aihio-cluster><aihio-button variant="outline">Cancel</aihio-button><aihio-button>Save</aihio-button></aihio-cluster>',
  },
  // Smaller days than the default, so the month fits a card on the index.
  'aihio-calendar': {
    thumbnail: '<aihio-calendar aria-label="Delivery day preview" value="2026-10-14" min="2026-10-05" style="--aihio-calendar-cell-size: 1.75rem"></aihio-calendar>',
  },
  'aihio-card': {
    layout: 'wide',
    variants: {
      variant: (value) => `<aihio-card variant="${value}"><aihio-card-header><aihio-card-title>${title(value)}</aihio-card-title><aihio-card-description>A ${value} card.</aihio-card-description></aihio-card-header></aihio-card>`,
    },
    thumbnail: '<aihio-card><aihio-card-header><aihio-card-title>Billing</aihio-card-title><aihio-card-description>Your plan renews on 1 May.</aihio-card-description></aihio-card-header></aihio-card>',
  },
  'aihio-cluster': {
    layout: 'stack',
    variants: {
      gap: (value) => `<aihio-cluster gap="${value}">${boxes(4)}</aihio-cluster>`,
    },
    thumbnail: `<aihio-cluster>${boxes(4)}</aihio-cluster>`,
  },
  'aihio-combobox': {
    variants: {
      size: (value) => `<aihio-combobox size="${value}" aria-label="Country, size ${value}" placeholder="Size ${value}"><aihio-option value="fi">Finland</aihio-option></aihio-combobox>`,
    },
    thumbnail: '<aihio-combobox aria-label="Country" value="fi"><aihio-option value="fi">Finland</aihio-option><aihio-option value="se">Sweden</aihio-option></aihio-combobox>',
  },
  'aihio-data-grid': {
    thumbnail: '<aihio-data-grid row-count="3" density="compact" style="--aihio-data-grid-height: auto"><table aria-label="Requests preview"><thead><tr><th scope="col" data-sortable="id" aria-sort="ascending">Request</th><th scope="col" data-numeric>Duration</th></tr></thead><tbody><tr><th scope="row">#1</th><td data-numeric>38</td></tr><tr><th scope="row">#2</th><td data-numeric>412</td></tr><tr><th scope="row">#3</th><td data-numeric>17</td></tr></tbody></table></aihio-data-grid>',
  },
  'aihio-date-picker': {
    variants: {
      size: (value) => `<aihio-date-picker size="${value}" aria-label="Due date, size ${value}" value="2026-10-14"></aihio-date-picker>`,
    },
    thumbnail: '<aihio-date-picker aria-label="Due date preview" value="2026-10-14"></aihio-date-picker>',
  },
  'aihio-dialog': {
    thumbnail: '<aihio-button commandfor="thumbnail-dialog" command="--open" variant="outline">Open dialog</aihio-button><aihio-dialog id="thumbnail-dialog"><aihio-dialog-header><aihio-dialog-title>A dialog</aihio-dialog-title><aihio-dialog-description>Opened from markup, with no script.</aihio-dialog-description></aihio-dialog-header><aihio-dialog-footer><aihio-button commandfor="thumbnail-dialog" command="--close">Close</aihio-button></aihio-dialog-footer></aihio-dialog>',
  },
  'aihio-dropdown': {
    thumbnail: '<aihio-dropdown><aihio-button slot="trigger" variant="outline">Menu</aihio-button><aihio-dropdown-item>Edit</aihio-dropdown-item><aihio-dropdown-item>Duplicate</aihio-dropdown-item></aihio-dropdown>',
  },
  'aihio-field': {
    thumbnail: '<aihio-field><label slot="label">Email</label><aihio-input type="email" name="thumbnail-email" placeholder="you@example.com"></aihio-input></aihio-field>',
  },
  'aihio-grid': {
    layout: 'stack',
    variants: {
      columns: (value) => `<aihio-grid columns="${value}">${boxes(Number(value))}</aihio-grid>`,
    },
    thumbnail: `<aihio-grid columns="2">${boxes(2)}</aihio-grid>`,
  },
  'aihio-input': {
    variants: {
      size: (value) => `<aihio-input size="${value}" aria-label="Size ${value}" placeholder="Size ${value}"></aihio-input>`,
    },
    thumbnail: '<aihio-input aria-label="Search" placeholder="Search…"></aihio-input>',
  },
  'aihio-pagination': {
    thumbnail: '<aihio-pagination page="3" pages="12" href="#pagination-thumbnail-{page}" aria-label="Pagination preview"></aihio-pagination>',
  },
  'aihio-stack': {
    variants: {
      gap: (value) => `<aihio-stack gap="${value}">${boxes(3)}</aihio-stack>`,
    },
    thumbnail: `<aihio-stack gap="sm">${boxes(3)}</aihio-stack>`,
  },
  'aihio-switch': {
    thumbnail: '<aihio-field><label slot="label">Email notifications</label><aihio-switch name="thumbnail-notifications" checked></aihio-switch></aihio-field>',
  },
  'aihio-table': {
    layout: 'stack',
    variants: {
      density: (value) => `<aihio-table density="${value}"><table><caption>${title(value)} density</caption><thead><tr><th scope="col">Service</th><th scope="col" data-numeric>Requests</th></tr></thead><tbody><tr><th scope="row">api-gateway</th><td data-numeric>12,480</td></tr><tr><th scope="row">billing-worker</th><td data-numeric>3,215</td></tr></tbody></table></aihio-table>`,
    },
    thumbnail: '<aihio-table density="compact"><table aria-label="Invoices"><thead><tr><th scope="col" data-sortable aria-sort="ascending">Invoice</th><th scope="col">Status</th><th scope="col" data-numeric>Amount</th></tr></thead><tbody><tr><th scope="row">INV-1042</th><td><aihio-badge variant="success">Paid</aihio-badge></td><td data-numeric>€1,250.00</td></tr><tr><th scope="row">INV-1043</th><td><aihio-badge variant="warning">Due</aihio-badge></td><td data-numeric>€980.50</td></tr></tbody></table></aihio-table>',
  },
  'aihio-tabs': {
    thumbnail: '<aihio-tabs value="general"><aihio-tab-list><aihio-tab value="general">General</aihio-tab><aihio-tab value="billing">Billing</aihio-tab></aihio-tab-list><aihio-tab-panel value="general">General settings</aihio-tab-panel><aihio-tab-panel value="billing">Billing settings</aihio-tab-panel></aihio-tabs>',
  },
  'aihio-toggle': {
    variants: {
      variant: (value) => `<aihio-toggle variant="${value}" pressed>${title(value)}</aihio-toggle>`,
      size: (value) => `<aihio-toggle size="${value}">Size ${value}</aihio-toggle>`,
    },
    thumbnail: '<aihio-cluster gap="tight"><aihio-toggle pressed aria-label="Bold">B</aihio-toggle><aihio-toggle aria-label="Italic">I</aihio-toggle></aihio-cluster>',
  },
};
