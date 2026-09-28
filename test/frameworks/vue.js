import { createApp, h, nextTick, onMounted, ref } from 'vue';
import '../../dist/aihio.js';

createApp({
  setup() {
    const value = ref('initial');
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
    ];
  },
}).mount('#app');
