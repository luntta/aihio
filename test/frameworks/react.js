import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import '../../dist/aihio.js';

const FRUITS_INITIAL = ['Apple', 'Banana'];
const FRUITS_UPDATED = ['Banana', 'Cherry', 'Date'];

function App() {
  const [value, setValue] = useState('initial');

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
    ))
  );
}

createRoot(document.querySelector('#app')).render(React.createElement(App));
