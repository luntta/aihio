import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import '../../dist/aihio.js';

// A grid of 100,000 rows from state: the framework renders the window asked for.
const GRID_ROWS = Array.from({ length: 100000 }, (_, index) => ({ id: index + 1, name: `Item ${index + 1}` }));
const GRID_ROWS_REVERSED = [...GRID_ROWS].reverse();

const FRUITS_INITIAL = ['Apple', 'Banana'];
const FRUITS_UPDATED = ['Banana', 'Cherry', 'Date'];

function App() {
  const [value, setValue] = useState('initial');
  const [direction, setDirection] = useState('ascending');
  const [pantry, setPantry] = useState(['Fig', 'Banana', 'Cherry']);
  const [range, setRange] = useState({ start: 0, end: 0 });
  const [gridDirection, setGridDirection] = useState('ascending');
  const gridRows = gridDirection === 'ascending' ? GRID_ROWS : GRID_ROWS_REVERSED;
  const order = direction === 'ascending' ? 1 : -1;
  const sortedFruits = [...FRUITS_UPDATED].sort((left, right) => left.localeCompare(right) * order);

  useEffect(() => {
    setValue('updated');
  }, []);

  useEffect(() => {
    if (value === 'updated') document.body.dataset.status = 'ready';
  }, [value]);

  return React.createElement(React.Fragment, null,
    React.createElement('aihio-input', {
      id: 'framework-input',
      value,
      'aria-label': 'Name',
      onInput: (event) => {
        document.body.dataset.eventValue = event.target.value;
      },
    }),
    React.createElement('aihio-button', {
      id: 'framework-button',
      onClick: () => {
        document.body.dataset.clicked = 'true';
      },
    }, value === 'updated' ? 'Updated action' : 'Initial action'),
    // The option list changes after mount, as a search result would: React
    // removes and inserts its own <aihio-option> nodes inside the host.
    React.createElement('aihio-combobox', {
      id: 'framework-combobox',
      'aria-label': 'Fruit',
      value: 'banana',
      'onaihio-change': (event) => {
        document.body.dataset.comboboxValue = event.detail.value;
      },
    }, (value === 'updated' ? FRUITS_UPDATED : FRUITS_INITIAL).map((fruit) =>
      React.createElement('aihio-option', { key: fruit, value: fruit.toLowerCase() }, fruit)
    )),
    // The app sorts: rows and aria-sort both render from its state, and the
    // header's text changes after mount, as a translation loading would.
    React.createElement('aihio-table', {
      id: 'framework-manual-table',
      'manual-sort': true,
      'onaihio-sort': (event) => setDirection(event.detail.direction),
    }, React.createElement('table', null,
      React.createElement('caption', null, 'Fruit'),
      React.createElement('thead', null, React.createElement('tr', null,
        React.createElement('th', { scope: 'col', 'data-sortable': 'fruit', 'aria-sort': direction },
          value === 'updated' ? 'Fruit name' : 'Fruit'))),
      React.createElement('tbody', null, sortedFruits.map((fruit) =>
        React.createElement('tr', { key: fruit }, React.createElement('th', { scope: 'row' }, fruit))))
    )),
    // The table sorts rows the app renders, and the app goes on adding and
    // removing them.
    React.createElement('aihio-table', { id: 'framework-auto-table' }, React.createElement('table', null,
      React.createElement('caption', null, 'Pantry'),
      React.createElement('thead', null, React.createElement('tr', null,
        React.createElement('th', { scope: 'col', 'data-sortable': 'item' }, 'Item'))),
      React.createElement('tbody', null, pantry.map((item) =>
        React.createElement('tr', { key: item }, React.createElement('th', { scope: 'row' }, item))))
    )),
    React.createElement('button', {
      id: 'framework-add-item',
      type: 'button',
      onClick: () => setPantry((items) => [...items, 'Grape']),
    }, 'Add item'),
    React.createElement('aihio-data-grid', {
      id: 'framework-grid',
      'row-count': GRID_ROWS.length,
      style: { '--aihio-data-grid-height': '16rem' },
      'onaihio-range': (event) => setRange(event.detail),
      'onaihio-sort': (event) => setGridDirection(event.detail.direction),
    }, React.createElement('table', { 'aria-label': 'Items' },
      React.createElement('thead', null, React.createElement('tr', null,
        React.createElement('th', { scope: 'col', 'data-sortable': 'id', 'aria-sort': gridDirection }, 'Item'))),
      React.createElement('tbody', null, gridRows.slice(range.start, range.end).map((row) =>
        React.createElement('tr', { key: row.id }, React.createElement('th', { scope: 'row' }, row.name))))
    )),
    React.createElement('button', {
      id: 'framework-remove-item',
      type: 'button',
      onClick: () => setPantry((items) => items.filter((item) => item !== 'Cherry')),
    }, 'Remove item')
  );
}

createRoot(document.querySelector('#app')).render(React.createElement(App));
