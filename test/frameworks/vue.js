import { Fragment, createApp, h, nextTick, onMounted, ref } from 'vue';
import '../../dist/aihio.js';

const FRUITS = ['Banana', 'Cherry', 'Date'];
const isWeekend = (date) => [0, 6].includes(new Date(date).getUTCDay());
const GRID_ROWS = Array.from({ length: 100000 }, (_, index) => ({ id: index + 1, name: `Item ${index + 1}` }));
const GRID_ROWS_REVERSED = [...GRID_ROWS].reverse();

createApp({
  setup() {
    const value = ref('initial');
    const direction = ref('ascending');
    const pantry = ref(['Fig', 'Banana', 'Cherry']);
    const range = ref({ start: 0, end: 0 });
    const gridDirection = ref('ascending');
    onMounted(async () => {
      value.value = 'updated';
      await nextTick();
      document.body.dataset.status = 'ready';
    });
    return () => [
      h('aihio-input', {
        id: 'framework-input',
        value: value.value,
        'aria-label': 'Name',
        onInput: (event) => {
          document.body.dataset.eventValue = event.target.value;
        },
      }),
      h('aihio-button', {
        id: 'framework-button',
        onClick: () => {
          document.body.dataset.clicked = 'true';
        },
      }, value.value === 'updated' ? 'Updated action' : 'Initial action'),
      h('aihio-combobox', {
        id: 'framework-combobox',
        'aria-label': 'Fruit',
        value: 'banana',
        onAihioChange: (event) => {
          document.body.dataset.comboboxValue = event.detail.value;
        },
      }, (value.value === 'updated' ? ['Banana', 'Cherry', 'Date'] : ['Apple', 'Banana']).map((fruit) =>
        h('aihio-option', { key: fruit, value: fruit.toLowerCase() }, fruit)
      )),
      h('aihio-date-picker', {
        id: 'framework-date',
        'aria-label': 'Delivery',
        value: '2026-10-14',
        isDateDisabled: isWeekend,
        onAihioChange: (event) => {
          document.body.dataset.dateValue = event.detail.value;
        },
      }),
      h('aihio-table', {
        id: 'framework-manual-table',
        'manual-sort': '',
        onAihioSort: (event) => {
          direction.value = event.detail.direction;
        },
      }, [h('table', [
        h('caption', 'Fruit'),
        h('thead', [h('tr', [
          h('th', { scope: 'col', 'data-sortable': 'fruit', 'aria-sort': direction.value },
            value.value === 'updated' ? 'Fruit name' : 'Fruit'),
        ])]),
        h('tbody', [...FRUITS]
          .sort((left, right) => left.localeCompare(right) * (direction.value === 'ascending' ? 1 : -1))
          .map((fruit) => h('tr', { key: fruit }, [h('th', { scope: 'row' }, fruit)]))),
      ])]),
      h('aihio-table', { id: 'framework-auto-table' }, [h('table', [
        h('caption', 'Pantry'),
        h('thead', [h('tr', [h('th', { scope: 'col', 'data-sortable': 'item' }, 'Item')])]),
        // A Fragment, as a template's v-for compiles to: Vue renders the rows
        // between two empty text nodes that mark where the list starts and ends.
        h('tbody', [h(Fragment, null, pantry.value.map((item) => h('tr', { key: item }, [h('th', { scope: 'row' }, item)])))]),
      ])]),
      h('button', {
        id: 'framework-add-item',
        type: 'button',
        onClick: () => {
          pantry.value = [...pantry.value, 'Grape'];
        },
      }, 'Add item'),
      h('aihio-data-grid', {
        id: 'framework-grid',
        'row-count': GRID_ROWS.length,
        style: { '--aihio-data-grid-height': '16rem' },
        onAihioRange: (event) => {
          range.value = event.detail;
        },
        onAihioSort: (event) => {
          gridDirection.value = event.detail.direction;
        },
      }, [h('table', { 'aria-label': 'Items' }, [
        h('thead', [h('tr', [h('th', { scope: 'col', 'data-sortable': 'id', 'aria-sort': gridDirection.value }, 'Item')])]),
        h('tbody', [h(Fragment, null, (gridDirection.value === 'ascending' ? GRID_ROWS : GRID_ROWS_REVERSED)
          .slice(range.value.start, range.value.end)
          .map((row) => h('tr', { key: row.id }, [h('th', { scope: 'row' }, row.name)])))]),
      ])]),
      h('button', {
        id: 'framework-remove-item',
        type: 'button',
        onClick: () => {
          pantry.value = pantry.value.filter((item) => item !== 'Cherry');
        },
      }, 'Remove item'),
    ];
  },
}).mount('#app');
