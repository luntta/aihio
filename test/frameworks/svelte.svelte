<script>
  import { onMount, tick } from 'svelte';
  import '../../../dist/aihio.js';

  let value = 'initial';
  onMount(async () => {
    value = 'updated';
    await tick();
    document.body.dataset.status = 'ready';
  });

  $: fruits = value === 'updated' ? ['Banana', 'Cherry', 'Date'] : ['Apple', 'Banana'];

  const GRID_ROWS = Array.from({ length: 100000 }, (_, index) => ({ id: index + 1, name: `Item ${index + 1}` }));
  const GRID_ROWS_REVERSED = [...GRID_ROWS].reverse();
  let range = { start: 0, end: 0 };
  let gridDirection = 'ascending';
  $: gridRows = (gridDirection === 'ascending' ? GRID_ROWS : GRID_ROWS_REVERSED).slice(range.start, range.end);

  let direction = 'ascending';
  let pantry = ['Fig', 'Banana', 'Cherry'];
  $: sortedFruits = ['Banana', 'Cherry', 'Date']
    .sort((left, right) => left.localeCompare(right) * (direction === 'ascending' ? 1 : -1));

  const isWeekend = (date) => [0, 6].includes(new Date(date).getUTCDay());

  function handleInput(event) {
    document.body.dataset.eventValue = event.target.value;
  }
</script>

<aihio-input id="framework-input" aria-label="Name" value={value} oninput={handleInput}></aihio-input>
<aihio-button id="framework-button" onclick={() => document.body.dataset.clicked = 'true'}>
  {value === 'updated' ? 'Updated action' : 'Initial action'}
</aihio-button>
<aihio-combobox
  id="framework-combobox"
  aria-label="Fruit"
  value="banana"
  onaihio-change={(event) => document.body.dataset.comboboxValue = event.detail.value}
>
  {#each fruits as fruit (fruit)}
    <aihio-option value={fruit.toLowerCase()}>{fruit}</aihio-option>
  {/each}
</aihio-combobox>

<aihio-date-picker
  id="framework-date"
  aria-label="Delivery"
  value="2026-10-14"
  isDateDisabled={isWeekend}
  onaihio-change={(event) => document.body.dataset.dateValue = event.detail.value}
></aihio-date-picker>

<aihio-table id="framework-manual-table" manual-sort onaihio-sort={(event) => direction = event.detail.direction}>
  <table>
    <caption>Fruit</caption>
    <thead>
      <tr><th scope="col" data-sortable="fruit" aria-sort={direction}>{value === 'updated' ? 'Fruit name' : 'Fruit'}</th></tr>
    </thead>
    <tbody>
      {#each sortedFruits as fruit (fruit)}
        <tr><th scope="row">{fruit}</th></tr>
      {/each}
    </tbody>
  </table>
</aihio-table>

<aihio-table id="framework-auto-table">
  <table>
    <caption>Pantry</caption>
    <thead>
      <tr><th scope="col" data-sortable="item">Item</th></tr>
    </thead>
    <tbody>
      {#each pantry as item (item)}
        <tr><th scope="row">{item}</th></tr>
      {/each}
    </tbody>
  </table>
</aihio-table>

<aihio-data-grid
  id="framework-grid"
  row-count={GRID_ROWS.length}
  style="--aihio-data-grid-height: 16rem"
  onaihio-range={(event) => range = event.detail}
  onaihio-sort={(event) => gridDirection = event.detail.direction}
>
  <table aria-label="Items">
    <thead>
      <tr><th scope="col" data-sortable="id" aria-sort={gridDirection}>Item</th></tr>
    </thead>
    <tbody>
      {#each gridRows as row (row.id)}
        <tr><th scope="row">{row.name}</th></tr>
      {/each}
    </tbody>
  </table>
</aihio-data-grid>

<button id="framework-add-item" type="button" onclick={() => pantry = [...pantry, 'Grape']}>Add item</button>
<button id="framework-remove-item" type="button" onclick={() => pantry = pantry.filter((item) => item !== 'Cherry')}>Remove item</button>
