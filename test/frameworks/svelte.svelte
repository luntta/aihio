<script>
  import { onMount, tick } from 'svelte';
  import '../../../dist/aihio.js';

  let value = 'initial';
  onMount(async () => {
    value = 'updated';
    await tick();
    document.body.dataset.status = 'ready';
  });

  function handleInput(event) {
    document.body.dataset.eventValue = event.target.value;
  }
</script>

<aihio-input id="framework-input" aria-label="Name" value={value} oninput={handleInput}></aihio-input>
<aihio-button id="framework-button" onclick={() => document.body.dataset.clicked = 'true'}>
  {value === 'updated' ? 'Updated action' : 'Initial action'}
</aihio-button>
