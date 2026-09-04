import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import '../../dist/aihio.js';

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
    }, value === 'updated' ? 'Updated action' : 'Initial action')
  );
}

createRoot(document.querySelector('#app')).render(React.createElement(App));
