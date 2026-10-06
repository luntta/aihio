import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const GRID = `
  <aihio-data-grid id="grid" row-count="100000" style="--aihio-data-grid-height: 24rem">
    <table aria-label="Requests">
      <colgroup><col style="width: 9rem"><col style="width: 7rem"><col><col style="width: 8rem"></colgroup>
      <thead>
        <tr>
          <th scope="col" data-sortable="id" aria-sort="ascending">Request</th>
          <th scope="col" data-sortable="method">Method</th>
          <th scope="col">Path</th>
          <th scope="col" data-sortable="duration" data-numeric>Duration</th>
        </tr>
      </thead>
      <tbody></tbody>
    </table>
  </aihio-data-grid>
  <button id="after">After</button>
`;

/**
 * Mount a grid and answer its requests the way a page would: rows live in
 * script, aihio-range renders a slice of them, aihio-sort reorders them.
 * `delay` makes the answers arrive later, as from a server.
 */
async function mount(page, { markup = GRID, theme = null, delay = null, rows = 100000 } = {}) {
  await page.goto('/test/playwright/fixture.html');
  await page.evaluate(() => customElements.whenDefined('aihio-data-grid'));
  await page.locator('#fixture').evaluate((root, { markup, theme, delay, rows: count }) => {
    if (theme) {
      document.documentElement.dataset.theme = theme;
      getComputedStyle(document.documentElement).color;
    }
    root.innerHTML = markup;
    const grid = root.querySelector('#grid');
    const methods = ['GET', 'POST', 'PATCH', 'DELETE'];
    window.rows = Array.from({ length: count }, (_, index) => ({ id: index + 1, method: methods[index % 4], duration: (index * 37) % 1500 }));
    window.ranges = [];
    window.cell = (row) => `<th scope="row">#${row.id}</th><td>${row.method}</td><td><a href="#request-${row.id}">/requests/${row.id}</a></td><td data-numeric>${row.duration}</td>`;
    const render = (start, end) => {
      grid.body.replaceChildren(...window.rows.slice(start, end).map((row) => {
        const tr = document.createElement('tr');
        tr.innerHTML = window.cell(row);
        return tr;
      }));
    };
    grid.addEventListener('aihio-range', ({ detail: { start, end } }) => {
      window.ranges.push([start, end]);
      if (delay === null) render(start, end);
      else setTimeout(() => { if (start === grid.start && end === grid.end) render(start, end); }, delay);
    });
    grid.addEventListener('aihio-sort', ({ detail: { column, direction } }) => {
      const order = direction === 'ascending' ? 1 : -1;
      window.rows.sort((a, b) => (a[column] > b[column] ? 1 : a[column] < b[column] ? -1 : 0) * order);
    });
    render(grid.start, grid.end);
  }, { markup, theme, delay, rows });
  await expect(page.locator('#grid tbody:not([data-grid-part]) tr').first()).toBeAttached();
}

/** The rendered rows: each one's aria-rowindex and first cell. */
function rendered(page) {
  return page.locator('#grid').evaluate((grid) => [...grid.body.rows].map((row) => [Number(row.getAttribute('aria-rowindex')), row.cells[0].textContent]));
}

function focused(page) {
  return page.evaluate(() => {
    const element = document.activeElement;
    const row = element.closest('tr');
    return `${row?.getAttribute('aria-rowindex') ?? '-'} ${element.localName} ${element.textContent.trim()}`.trim();
  });
}

test('a grid of every row, rendering only those in view, each saying where it is', async ({ page }) => {
  await mount(page);
  const grid = page.locator('#grid');
  const table = grid.locator('table');
  await expect(table).toHaveAttribute('role', 'grid');
  await expect(table).toHaveAttribute('aria-rowcount', '100001');
  await expect(page.getByRole('grid', { name: 'Requests' })).toBeVisible();

  const rows = await rendered(page);
  expect(rows.length).toBeGreaterThan(5);
  expect(rows.length).toBeLessThan(60);
  expect(rows[0]).toEqual([2, '#1']);
  rows.forEach(([index, name], position) => expect([index, name]).toEqual([position + 2, `#${position + 1}`]));

  // The spacers give the box the height of every row.
  const { scrollHeight, rowHeight } = await grid.evaluate((element) => ({
    scrollHeight: element.scrollHeight,
    rowHeight: element.body.rows[0].getBoundingClientRect().height,
  }));
  expect(Math.abs(scrollHeight - (100000 * rowHeight + rowHeight))).toBeLessThan(rowHeight * 2);

  // The grid's own sections are hidden from assistive technology.
  await expect(grid.locator('tbody[data-grid-part]')).toHaveCount(2);
  for (const spacer of await grid.locator('tbody[data-grid-part]').all()) await expect(spacer).toHaveAttribute('aria-hidden', 'true');
});

test('scrolling asks for the rows in view, and rows that arrive late land in place', async ({ page }) => {
  for (const delay of [null, 80]) {
    await mount(page, { delay });
    const grid = page.locator('#grid');
    await grid.evaluate((element) => { element.scrollTop = (element.scrollHeight - element.clientHeight) / 2; });
    // The rows rendered begin a few above those in view: halfway is #50,000.
    await expect.poll(async () => Math.abs(Number((await rendered(page))[0]?.[1].slice(1)) - 50000)).toBeLessThan(60);

    const { start, end } = await grid.evaluate((element) => ({ start: element.start, end: element.end }));
    const rows = await rendered(page);
    expect(rows[0]).toEqual([start + 2, `#${start + 1}`]);
    expect(rows.at(-1)).toEqual([end + 1, `#${end}`]);

    // What is in view is what the rows say: the row at the top of the box,
    // under the header, is the one whose index the scroll position implies.
    const top = await grid.evaluate((element) => {
      const box = element.getBoundingClientRect();
      // The header cells stick; the <thead> box itself scrolls away.
      const header = element.table.tHead.rows[0].cells[0].getBoundingClientRect();
      const row = document.elementFromPoint(box.left + 40, header.bottom + 5)?.closest('tr');
      return Number(row?.getAttribute('aria-rowindex'));
    });
    expect(top).toBeGreaterThan(start + 1);
    expect(top).toBeLessThan(end + 2);
  }
});

test('the keyboard: one tab stop, arrows between cells, and jumps to rows not rendered', async ({ page }) => {
  await mount(page);
  await page.locator('#background').focus();
  await page.keyboard.press('Tab');
  expect(await focused(page)).toBe('1 button Request');
  await expect(page.locator('#grid [tabindex="0"]')).toHaveCount(1);

  await page.keyboard.press('ArrowDown');
  expect(await focused(page)).toBe('2 th #1');
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowRight');
  // A cell holding one link is focused on the link.
  expect(await focused(page)).toBe('2 a /requests/1');
  await page.keyboard.press('End');
  expect(await focused(page)).toBe('2 td 0');
  await page.keyboard.press('Home');
  expect(await focused(page)).toBe('2 th #1');

  await page.keyboard.press('PageDown');
  expect(await focused(page)).toMatch(/^\d+ th #\d+$/);
  const afterPage = Number((await focused(page)).split(' ')[0]);
  expect(afterPage).toBeGreaterThan(5);

  await page.keyboard.press('Control+End');
  await expect.poll(() => focused(page)).toBe('100001 td 963');
  await page.keyboard.press('ArrowUp');
  await expect.poll(() => focused(page)).toBe('100000 td 926');
  await page.keyboard.press('Control+Home');
  await expect.poll(() => focused(page)).toBe('1 button Request');

  // Still one tab stop, and Tab leaves the grid.
  await expect(page.locator('#grid [tabindex="0"]')).toHaveCount(1);
  await page.keyboard.press('Tab');
  await expect(page.locator('#after')).toBeFocused();
});

test('a cell of several controls is entered with Enter and left with Escape; a field keeps its keys', async ({ page }) => {
  await mount(page);
  await page.locator('#grid').evaluate((grid) => {
    window.cell = (row) => `<th scope="row">#${row.id}</th><td><button type="button">Retry</button> <button type="button">Cancel</button></td><td><input aria-label="Note for ${row.id}" value="note"></td><td data-numeric>${row.duration}</td>`;
    grid.body.replaceChildren(...window.rows.slice(grid.start, grid.end).map((row) => {
      const tr = document.createElement('tr');
      tr.innerHTML = window.cell(row);
      return tr;
    }));
  });
  await page.locator('#background').focus();
  await page.keyboard.press('Tab');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('ArrowRight');
  expect(await focused(page)).toBe('2 td Retry Cancel');

  await page.keyboard.press('Enter');
  expect(await focused(page)).toBe('2 button Retry');
  await page.keyboard.press('Tab');
  expect(await focused(page)).toBe('2 button Cancel');
  await page.keyboard.press('Escape');
  expect(await focused(page)).toBe('2 td Retry Cancel');

  // The only control in the next cell is a text field: the arrows move its
  // caret, not the grid's focus.
  await page.keyboard.press('ArrowRight');
  expect(await focused(page)).toBe('2 input');
  await page.keyboard.press('ArrowLeft');
  expect(await focused(page)).toBe('2 input');
});

test('focus on a row scrolled away and removed moves to its column\'s header', async ({ page }) => {
  await mount(page);
  await page.locator('#background').focus();
  await page.keyboard.press('Tab');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('ArrowRight');
  expect(await focused(page)).toBe('2 td GET');

  await page.locator('#grid').evaluate((grid) => { grid.scrollTop = grid.scrollHeight / 2; });
  await expect.poll(() => focused(page)).toBe('1 button Method');
});

test('a sort marks the header, says so, and asks for the rows from the top', async ({ page }) => {
  await mount(page);
  const grid = page.locator('#grid');
  await grid.evaluate((element) => {
    window.sorts = [];
    element.addEventListener('aihio-sort', (event) => window.sorts.push(event.detail));
    element.scrollTop = 40000;
  });
  await expect.poll(async () => (await rendered(page))[0][0]).toBeGreaterThan(500);

  await page.getByRole('button', { name: 'Duration' }).click();
  await expect(page.getByRole('columnheader', { name: 'Duration' })).toHaveAttribute('aria-sort', 'ascending');
  await expect(page.getByRole('columnheader', { name: 'Request' })).not.toHaveAttribute('aria-sort');
  expect(await page.evaluate(() => window.sorts)).toEqual([{ column: 'duration', direction: 'ascending' }]);
  await expect(page.locator('#grid > [role="status"]')).toHaveText('Sorted by Duration, ascending');

  // Back at the top, in the new order.
  await expect.poll(() => grid.evaluate((element) => element.scrollTop)).toBe(0);
  const rows = await grid.evaluate((element) => [...element.body.rows].map((row) => Number(row.cells[3].textContent)));
  expect(rows).toEqual([...rows].sort((a, b) => a - b));
  expect(rows[0]).toBe(0);
});

test('a new row count asks for the rows again; none at all leaves an empty grid', async ({ page }) => {
  await mount(page);
  const grid = page.locator('#grid');
  await grid.evaluate((element) => {
    window.rows = window.rows.filter((row) => row.method === 'POST');
    element.rowCount = window.rows.length;
  });
  await expect(grid.locator('table')).toHaveAttribute('aria-rowcount', '25001');
  await expect.poll(async () => (await rendered(page))[0]).toEqual([2, '#2']);

  await grid.evaluate((element) => {
    window.rows = [];
    element.rowCount = 0;
  });
  await expect(grid.locator('table')).toHaveAttribute('aria-rowcount', '1');
  await expect.poll(async () => (await rendered(page)).length).toBe(0);
  // The keyboard stays on the header.
  await page.locator('#background').focus();
  await page.keyboard.press('Tab');
  await page.keyboard.press('ArrowDown');
  expect(await focused(page)).toBe('1 button Request');
});

test('columns keep their widths as rows of different lengths come and go', async ({ page }) => {
  await mount(page);
  const widths = () => page.locator('#grid thead th').evaluateAll((cells) => cells.map((cell) => Math.round(cell.getBoundingClientRect().width)));
  const before = await widths();
  await page.locator('#grid').evaluate((grid) => {
    window.cell = (row) => `<th scope="row">#${row.id} with a much longer name than fits</th><td>${row.method}</td><td>/a/very/long/path/that/would/widen/an/automatic/column/${row.id}</td><td data-numeric>${row.duration}</td>`;
    grid.scrollTop = 20000;
  });
  await expect.poll(async () => (await rendered(page))[0][0]).toBeGreaterThan(100);
  expect(await widths()).toEqual(before);
  // Text that does not fit ends in an ellipsis, on one line.
  await expect(page.locator('#grid tbody:not([data-grid-part]) th').first()).toHaveCSS('text-overflow', 'ellipsis');
});

test('loading marks the table busy, and the box is not a tab stop of its own', async ({ page }) => {
  await mount(page);
  const grid = page.locator('#grid');
  await grid.evaluate((element) => element.setAttribute('loading', ''));
  await expect(grid.locator('table')).toHaveAttribute('aria-busy', 'true');
  await grid.evaluate((element) => element.removeAttribute('loading'));
  await expect(grid.locator('table')).not.toHaveAttribute('aria-busy');
  await expect(grid).toHaveAttribute('tabindex', '-1');
});

for (const theme of ['light', 'dark']) {
  test(`a sorted, scrolled grid has no automated accessibility violations (${theme})`, async ({ page }) => {
    await mount(page, { theme });
    await page.getByRole('button', { name: 'Method' }).click();
    await page.locator('#grid').evaluate((grid) => { grid.scrollTop = 12345; });
    await expect.poll(async () => (await rendered(page))[0][0]).toBeGreaterThan(100);
    await page.locator('#background').focus();
    await page.keyboard.press('Tab');
    await page.keyboard.press('ArrowDown');

    // #after is the page's bare <button>, only there to tab to. In the dark
    // theme WebKit paints it dark, but computes its background as light grey,
    // and axe, which reads computed colours, reports contrast that is not there.
    const results = await new AxeBuilder({ page }).include('#fixture').exclude('#after').analyze();
    expect(results.violations.map(({ id, nodes }) => ({ id, targets: nodes.map((node) => node.target) }))).toEqual([]);
  });
}
