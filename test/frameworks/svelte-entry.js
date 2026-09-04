import { mount } from 'svelte';
import App from './generated/svelte-component.js';

mount(App, { target: document.querySelector('#app') });
