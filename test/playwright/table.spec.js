import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

async function mount(page, markup, { lang = 'en', theme = null } = {}) {
  await page.goto('/test/playwright/fixture.html');
  await page.evaluate(() => customElements.whenDefined('aihio-table'));
  await page.locator('#fixture').evaluate((root, { html, lang, theme }) => {
    document.documentElement.lang = lang;
    if (theme) {
      document.documentElement.dataset.theme = theme;
      // See patterns.spec.js: resolve the theme before the markup lands.
      getComputedStyle(document.documentElement).color;
    }
    root.innerHTML = html;
  }, { html: markup, lang, theme });
}

/** The text of each body row's cell in `index`, top to bottom. */
function column(page, index = 0, id = 'table') {
  return page.locator(`#${id}`).evaluate((host, index) =>
    [...host.table.tBodies].flatMap((body) => [...body.rows].map((row) => row.cells[index]?.textContent.trim() ?? '')), index);
}

function sortState(page, id = 'table') {
  return page.locator(`#${id}`).evaluate((host) =>
    [...host.table.tHead.rows[0].cells].map((cell) => cell.getAttribute('aria-sort')));
}

const PEOPLE = `
  <aihio-table id="table">
    <table>
      <caption>People</caption>
      <thead>
        <tr>
          <th scope="col" data-sortable="name">Name</th>
          <th scope="col" data-sortable="balance" data-numeric>Balance</th>
          <th scope="col" data-sortable="joined">Joined</th>
          <th scope="col" data-sortable>Plan</th>
          <th scope="col">Notes</th>
        </tr>
      </thead>
      <tbody>
        <tr><th scope="row">Örjan</th><td data-numeric>€1,250.50</td><td><time datetime="2021-03-01">1 Mar 2021</time></td><td>Plan 10</td><td>a</td></tr>
        <tr><th scope="row">Zoe</th><td data-numeric>€980.00</td><td><time datetime="2019-11-20">20 Nov 2019</time></td><td>Plan 2</td><td>b</td></tr>
        <tr><th scope="row">Ada</th><td data-numeric>—</td><td><time datetime="2024-06-15">15 Jun 2024</time></td><td>Plan 1</td><td>c</td></tr>
        <tr><th scope="row">Åsa</th><td data-numeric>€12,400.00</td><td></td><td>Plan 2</td><td>d</td></tr>
        <tr><th scope="row">Bob</th><td data-numeric>€-5.00</td><td><time datetime="2020-01-01">1 Jan 2020</time></td><td>plan 3</td><td>e</td></tr>
      </tbody>
    </table>
  </aihio-table>
`;

test('a sortable header becomes a button in the th, which sorts ascending and then descending', async ({ page }) => {
  await mount(page, PEOPLE);
  const name = page.getByRole('columnheader', { name: 'Name' });
  const button = name.getByRole('button', { name: 'Name' });
  await expect(button).toHaveAttribute('type', 'button');
  // The <th> keeps its role and carries the sort; the button only sorts.
  await expect(page.getByRole('columnheader')).toHaveCount(5);
  await expect(page.getByRole('columnheader', { name: 'Notes' }).getByRole('button')).toHaveCount(0);

  await button.click();
  await expect(name).toHaveAttribute('aria-sort', 'ascending');
  await expect(button).not.toHaveAttribute('aria-sort');
  expect(await column(page)).toEqual(['Ada', 'Åsa', 'Bob', 'Örjan', 'Zoe']);

  await button.press('Enter');
  await expect(name).toHaveAttribute('aria-sort', 'descending');
  expect(await column(page)).toEqual(['Zoe', 'Örjan', 'Bob', 'Åsa', 'Ada']);

  // Only one column is sorted at a time.
  await page.getByRole('button', { name: 'Joined' }).press('Space');
  expect(await sortState(page)).toEqual([null, null, 'ascending', null, null]);
});

test('the new order is announced in a polite status region, in the page\'s own words', async ({ page }) => {
  await mount(page, PEOPLE.replace('<aihio-table id="table">', '<aihio-table id="table" sort-descending-text="Lajiteltu: {column}, laskeva">'));
  const status = page.locator('#table > [role="status"]');
  await expect(status).toHaveText('');

  await page.getByRole('button', { name: 'Balance' }).click();
  await expect(status).toHaveText('Sorted by Balance, ascending');
  await page.getByRole('button', { name: 'Balance' }).click();
  await expect(status).toHaveText('Lajiteltu: Balance, laskeva');

  // The same message again is still a change a screen reader hears: the
  // region is emptied first, then filled.
  await page.locator('#table').evaluate((host) => host.sort('balance', 'ascending'));
  await status.evaluate((region) => {
    window.statusTexts = [];
    new MutationObserver(() => window.statusTexts.push(region.textContent))
      .observe(region, { childList: true, characterData: true, subtree: true });
  });
  await page.getByRole('button', { name: 'Balance' }).click();
  await expect.poll(() => page.evaluate(() => window.statusTexts)).toEqual(['', 'Lajiteltu: Balance, laskeva']);
});

test('figures, dates, and numbered text sort by value, and rows with no value go last either way', async ({ page }) => {
  await mount(page, PEOPLE);
  const sort = (label) => page.getByRole('button', { name: label }).click();

  // "€1,250.50" is a figure in English; the dash is no value at all.
  await sort('Balance');
  expect(await column(page, 1)).toEqual(['€-5.00', '€980.00', '€1,250.50', '€12,400.00', '—']);
  await sort('Balance');
  expect(await column(page, 1)).toEqual(['€12,400.00', '€1,250.50', '€980.00', '€-5.00', '—']);

  // A <time datetime> sorts by its machine-readable value, not its words.
  await sort('Joined');
  expect(await column(page, 2)).toEqual(['20 Nov 2019', '1 Jan 2020', '1 Mar 2021', '15 Jun 2024', '']);

  // Digits inside text compare as numbers, and case does not split them up.
  await sort('Plan');
  expect(await column(page, 3)).toEqual(['Plan 1', 'Plan 2', 'Plan 2', 'plan 3', 'Plan 10']);
});

test('data-sort-value gives text an order its words do not have', async ({ page }) => {
  await mount(page, `
    <aihio-table id="table">
      <table aria-label="Tickets">
        <thead><tr><th scope="col" data-sortable>Ticket</th><th scope="col" data-sortable>Priority</th></tr></thead>
        <tbody>
          <tr><th scope="row">T-1</th><td data-sort-value="3">Low</td></tr>
          <tr><th scope="row">T-2</th><td data-sort-value="1">High</td></tr>
          <tr><th scope="row">T-3</th><td data-sort-value="2">Medium</td></tr>
        </tbody>
      </table>
    </aihio-table>
  `);
  await page.getByRole('button', { name: 'Priority' }).click();
  expect(await column(page, 1)).toEqual(['High', 'Medium', 'Low']);
});

test('text and figures are read in the page\'s language', async ({ page }) => {
  await mount(page, PEOPLE, { lang: 'fi' });
  // In Finnish, å and ö are letters of their own, after z.
  await page.getByRole('button', { name: 'Name' }).click();
  expect(await column(page)).toEqual(['Ada', 'Bob', 'Zoe', 'Åsa', 'Örjan']);

  await page.locator('#table').evaluate((host) => {
    const figures = ['1 250,50 €', '980,00 €', '−5,00 €', '12 400,00 €', '7 €'];
    [...host.table.tBodies[0].rows].forEach((row, index) => { row.cells[1].textContent = figures[index]; });
  });
  await page.getByRole('button', { name: 'Balance' }).click();
  expect(await column(page, 1)).toEqual(['−5,00 €', '7 €', '980,00 €', '1 250,50 €', '12 400,00 €']);
});

test('ties keep their order, so a second sort is a two-level sort, and each body sorts on its own', async ({ page }) => {
  await mount(page, `
    <aihio-table id="table">
      <table>
        <caption>Members</caption>
        <thead><tr><th scope="col" data-sortable>Name</th><th scope="col" data-sortable>Team</th></tr></thead>
        <tbody>
          <tr><th scope="row">Dana</th><td>Ops</td></tr>
          <tr><th scope="row">Ari</th><td>Web</td></tr>
          <tr><th scope="row">Cy</th><td>Ops</td></tr>
          <tr><th scope="row">Bo</th><td>Web</td></tr>
        </tbody>
        <tbody>
          <tr><th scope="row">Zed</th><td>Data</td></tr>
          <tr><th scope="row">Eve</th><td>Data</td></tr>
        </tbody>
        <tfoot><tr><th scope="row">Total</th><td>6</td></tr></tfoot>
      </table>
    </aihio-table>
  `);

  await page.getByRole('button', { name: 'Name' }).click();
  await page.getByRole('button', { name: 'Team' }).click();
  // Grouped by team, by name within each team; the second body stays below
  // the first, and the footer stays put.
  expect(await column(page)).toEqual(['Cy', 'Dana', 'Ari', 'Bo', 'Eve', 'Zed']);
  expect(await page.locator('#table tfoot th').textContent()).toBe('Total');
});

test('aria-sort is the order: rows load in it, and setting it from script re-sorts them', async ({ page }) => {
  await mount(page, PEOPLE.replace('data-sortable="balance"', 'data-sortable="balance" aria-sort="descending"'));
  expect(await column(page, 1)).toEqual(['€12,400.00', '€1,250.50', '€980.00', '€-5.00', '—']);

  await page.getByRole('columnheader', { name: 'Name' }).evaluate((header) => header.setAttribute('aria-sort', 'ascending'));
  await expect.poll(() => column(page)).toEqual(['Ada', 'Åsa', 'Bob', 'Örjan', 'Zoe']);
  // The header marked last wins, and the stale mark is cleared.
  expect(await sortState(page)).toEqual(['ascending', null, null, null, null]);
});

test('rows added under a sorted header take their place; edits inside a row do not move it', async ({ page }) => {
  await mount(page, PEOPLE);
  await page.getByRole('button', { name: 'Name' }).click();

  await page.locator('#table').evaluate((host) => {
    const row = host.table.tBodies[0].insertRow();
    row.innerHTML = '<th scope="row">Carl</th><td data-numeric>€1.00</td><td></td><td>Plan 4</td><td>f</td>';
  });
  await expect.poll(() => column(page)).toEqual(['Ada', 'Åsa', 'Bob', 'Carl', 'Örjan', 'Zoe']);

  // A body replaced wholesale, as a server swap does, is put in order too.
  await page.locator('#table').evaluate((host) => {
    const body = document.createElement('tbody');
    body.innerHTML = '<tr><th scope="row">Yan</th><td></td><td></td><td></td><td></td></tr><tr><th scope="row">Kai</th><td></td><td></td><td></td><td></td></tr>';
    host.table.tBodies[0].replaceWith(body);
  });
  await expect.poll(() => column(page)).toEqual(['Kai', 'Yan']);

  await page.locator('#table').evaluate((host) => {
    host.table.tBodies[0].rows[0].cells[0].textContent = 'Zara';
  });
  await page.waitForTimeout(50);
  expect(await column(page)).toEqual(['Zara', 'Yan']);
});

test('a body added and sorted in one task is still watched for rows', async ({ page }) => {
  await mount(page, PEOPLE);
  await page.locator('#table').evaluate((host) => {
    const body = document.createElement('tbody');
    body.innerHTML = '<tr><th scope="row">Yan</th><td></td><td></td><td></td><td></td></tr>';
    host.table.append(body);
    // Before the observer has heard about the new body.
    host.sort('name');
  });
  await page.locator('#table').evaluate((host) => {
    const row = host.table.tBodies[1].insertRow(0);
    row.innerHTML = '<th scope="row">Zed</th><td></td><td></td><td></td><td></td>';
    host.table.tBodies[1].insertRow(0).innerHTML = '<th scope="row">Kai</th><td></td><td></td><td></td><td></td>';
  });
  await expect.poll(() => page.locator('#table').evaluate((host) =>
    [...host.table.tBodies[1].rows].map((row) => row.cells[0].textContent))).toEqual(['Kai', 'Yan', 'Zed']);
});

test('a click whose default an author\'s handler prevents does not sort', async ({ page }) => {
  await mount(page, PEOPLE.replace('<th scope="col" data-sortable>Plan</th>', '<th scope="col" data-sortable><button type="button" onclick="event.preventDefault()">Plan</button></th>'));
  await page.getByRole('button', { name: 'Plan' }).click();
  expect(await sortState(page)).toEqual([null, null, null, null, null]);
  expect(await column(page)).toEqual(['Örjan', 'Zoe', 'Ada', 'Åsa', 'Bob']);
});

test('manual-sort marks the header and reports the column, and leaves the rows to the page', async ({ page }) => {
  await mount(page, PEOPLE.replace('<aihio-table id="table">', '<aihio-table id="table" manual-sort>'));
  await page.locator('#table').evaluate((host) => {
    window.sorts = [];
    host.addEventListener('aihio-sort', (event) => window.sorts.push(event.detail));
  });

  await page.getByRole('button', { name: 'Balance' }).click();
  await page.getByRole('button', { name: 'Balance' }).click();
  await page.getByRole('button', { name: 'Plan' }).click();

  expect(await column(page)).toEqual(['Örjan', 'Zoe', 'Ada', 'Åsa', 'Bob']);
  expect(await sortState(page)).toEqual([null, null, null, 'ascending', null]);
  // A header with no column name is reported by its text.
  expect(await page.evaluate(() => window.sorts)).toEqual([
    { column: 'balance', direction: 'ascending' },
    { column: 'balance', direction: 'descending' },
    { column: 'Plan', direction: 'ascending' },
  ]);
  await expect(page.locator('#table > [role="status"]')).toHaveText('Sorted by Plan, ascending');

  // Turning manual-sort off hands the order back to the table.
  await page.locator('#table').evaluate((host) => host.removeAttribute('manual-sort'));
  await expect.poll(() => column(page, 3)).toEqual(['Plan 1', 'Plan 2', 'Plan 2', 'plan 3', 'Plan 10']);
});

test('sort() sorts quietly: no aihio-sort, no announcement', async ({ page }) => {
  await mount(page, PEOPLE);
  const fired = await page.locator('#table').evaluate(async (host) => {
    let count = 0;
    host.addEventListener('aihio-sort', () => { count += 1; });
    host.sort('joined', 'descending');
    host.sort('Name');
    host.sort('nothing-by-this-name');
    await new Promise((resolve) => setTimeout(resolve, 300));
    return count;
  });
  expect(fired).toBe(0);
  expect(await column(page)).toEqual(['Ada', 'Åsa', 'Bob', 'Örjan', 'Zoe']);
  expect(await sortState(page)).toEqual(['ascending', null, null, null, null]);
  await expect(page.locator('#table > [role="status"]')).toHaveText('');
});

for (const path of ['moveBefore', 'insertBefore']) {
  test(`focus inside a row survives the row being moved (${path})`, async ({ page }) => {
    await mount(page, PEOPLE.replace('<td>e</td>', '<td><input aria-label="Note for Bob" value="e"></td>'));
    // Without moveBefore() a moved row leaves the document for a moment,
    // and its focus has to be put back.
    if (path === 'insertBefore') await page.evaluate(() => { delete Element.prototype.moveBefore; });
    await page.getByRole('button', { name: 'Name' }).click();
    const note = page.getByRole('textbox', { name: 'Note for Bob' });
    await note.fill('extra');

    await page.locator('#table').evaluate((host) => host.sort('name', 'descending'));
    await expect(note).toBeFocused();
    await page.keyboard.type('!');
    await expect(note).toHaveValue('extra!');
  });
}

test('a header rewritten by a framework keeps its button, and an authored button is adopted', async ({ page }) => {
  await mount(page, `
    <form id="form">
      <aihio-table id="table">
        <table>
          <caption>People</caption>
          <thead><tr>
            <th scope="col" data-sortable>Name</th>
            <th scope="col" data-sortable><button>Team</button></th>
          </tr></thead>
          <tbody><tr><th scope="row">Ada</th><td>Web</td></tr><tr><th scope="row">Bo</th><td>Ops</td></tr></tbody>
        </table>
      </aihio-table>
    </form>
  `);

  // React and Vue update a text-only element by replacing all its children.
  await page.getByRole('columnheader', { name: 'Name' }).evaluate((header) => { header.textContent = 'Full name'; });
  const name = page.getByRole('columnheader', { name: 'Full name' });
  await expect(name.getByRole('button', { name: 'Full name' })).toHaveCount(1);
  await expect(name.locator('[data-table-part="sort-icon"]')).toHaveCount(1);

  // The author's button is the sort control: not wrapped in a second one,
  // and given type="button" so it cannot submit the form around the table.
  const team = page.getByRole('columnheader', { name: 'Team' });
  await expect(team.getByRole('button')).toHaveCount(1);
  await expect(team.getByRole('button')).toHaveAttribute('type', 'button');
  await team.getByRole('button').click();
  await expect(team).toHaveAttribute('aria-sort', 'ascending');
  expect(await column(page, 1)).toEqual(['Ops', 'Web']);

  // Dropping data-sortable hands the header its content back.
  await page.getByRole('columnheader', { name: 'Full name' }).evaluate((header) => header.removeAttribute('data-sortable'));
  await expect(page.getByRole('columnheader', { name: 'Full name' }).getByRole('button')).toHaveCount(0);
  await expect(page.getByRole('columnheader', { name: 'Full name' })).toHaveText('Full name');
});

test('a table nested in a cell sorts on its own, and a cloned table renders its parts once', async ({ page }) => {
  await mount(page, `
    <aihio-table id="table">
      <table>
        <caption>Outer</caption>
        <thead><tr><th scope="col" data-sortable>Group</th><th scope="col">Members</th></tr></thead>
        <tbody>
          <tr><th scope="row">B</th><td>
            <aihio-table id="inner">
              <table aria-label="Members of B">
                <thead><tr><th scope="col" data-sortable>Member</th></tr></thead>
                <tbody><tr><td>Yan</td></tr><tr><td>Kai</td></tr></tbody>
              </table>
            </aihio-table>
          </td></tr>
          <tr><th scope="row">A</th><td>None</td></tr>
        </tbody>
      </table>
    </aihio-table>
  `);

  await page.getByRole('button', { name: 'Member' }).click();
  expect(await column(page, 0, 'inner')).toEqual(['Kai', 'Yan']);
  expect(await column(page)).toEqual(['B', 'A']);
  expect(await sortState(page)).toEqual([null, null]);

  const parts = await page.locator('#table').evaluate((host) => {
    const clone = host.cloneNode(true);
    clone.id = 'clone';
    host.after(clone);
    return {
      status: clone.querySelectorAll(':scope > [data-table-part="status"]').length,
      buttons: clone.querySelectorAll(':scope > table > thead [data-table-part="sort"]').length,
    };
  });
  expect(parts).toEqual({ status: 1, buttons: 1 });
});

test('a table too wide for its box scrolls in a focusable region named by its caption', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 700 });
  await mount(page, PEOPLE);
  const host = page.locator('#table');
  await expect(host).toHaveAttribute('role', 'region');
  await expect(host).toHaveAttribute('tabindex', '0');
  const captionId = await page.locator('#table caption').getAttribute('id');
  await expect(host).toHaveAttribute('aria-labelledby', captionId);
  await expect(page.getByRole('region', { name: 'People' })).toBeVisible();

  // The keyboard scrolls it once it has focus.
  await host.focus();
  await page.keyboard.press('ArrowRight');
  await expect.poll(() => host.evaluate((element) => element.scrollLeft)).toBeGreaterThan(0);

  // Wide enough again, it is neither a tab stop nor a region.
  await page.setViewportSize({ width: 1200, height: 700 });
  await expect(host).not.toHaveAttribute('role');
  await expect(host).not.toHaveAttribute('tabindex');
  await expect(host).not.toHaveAttribute('aria-labelledby');
});

test('the scroll region takes aria-label from the table, and leaves an author\'s attributes alone', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 700 });
  await mount(page, `
    ${PEOPLE.replace('<caption>People</caption>', '').replace('<table>', '<table aria-label="Balances">')}
    ${PEOPLE.replace('id="table"', 'id="authored" tabindex="-1"')}
  `);
  await expect(page.getByRole('region', { name: 'Balances' })).toBeVisible();
  await expect(page.locator('#table')).toHaveAttribute('aria-label', 'Balances');

  await expect(page.locator('#authored')).toHaveAttribute('role', 'region');
  await expect(page.locator('#authored')).toHaveAttribute('tabindex', '-1');
  await page.setViewportSize({ width: 1200, height: 700 });
  await expect(page.locator('#authored')).not.toHaveAttribute('role');
  await expect(page.locator('#authored')).toHaveAttribute('tabindex', '-1');
});

test('edges with rows scrolled past them are marked, in either direction', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 700 });
  await mount(page, `${PEOPLE}<div dir="rtl">${PEOPLE.replace('id="table"', 'id="rtl"')}</div>`);

  for (const id of ['table', 'rtl']) {
    const host = page.locator(`#${id}`);
    await expect(host, id).not.toHaveAttribute('data-overflow-start');
    await expect(host, id).toHaveAttribute('data-overflow-end', '');

    await host.evaluate((element) => {
      const end = element.scrollWidth - element.clientWidth;
      element.scrollLeft = getComputedStyle(element).direction === 'rtl' ? -end : end;
    });
    await expect(host, id).toHaveAttribute('data-overflow-start', '');
    await expect(host, id).not.toHaveAttribute('data-overflow-end');
  }
});

test('sticky-header keeps every header row in view as the rows scroll under it', async ({ page }) => {
  const rows = Array.from({ length: 30 }, (_, index) => `<tr><th scope="row">Row ${index + 1}</th><td data-numeric>${index}</td><td data-numeric>${index * 2}</td></tr>`).join('');
  await mount(page, `
    <aihio-table id="table" sticky-header style="--aihio-table-max-height: 14rem">
      <table>
        <caption>Rows</caption>
        <thead>
          <tr><th scope="col" rowspan="2" data-sortable>Row</th><th scope="colgroup" colspan="2">Values</th></tr>
          <tr><th scope="col" data-sortable data-numeric>Single</th><th scope="col" data-numeric>Double</th></tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </aihio-table>
  `);
  const host = page.locator('#table');
  await expect(host).toHaveAttribute('role', 'region');

  const positions = await host.evaluate(async (element) => {
    element.scrollTop = 400;
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    const [first, second] = element.table.tHead.rows;
    return {
      box: element.getBoundingClientRect().top,
      first: first.cells[1].getBoundingClientRect(),
      second: second.cells[0].getBoundingClientRect().top,
      body: element.table.tBodies[0].rows[0].getBoundingClientRect().top,
    };
  });
  expect(Math.abs(positions.first.top - positions.box)).toBeLessThanOrEqual(1);
  // The second row sticks under the first, not on top of it.
  expect(Math.abs(positions.second - positions.first.bottom)).toBeLessThanOrEqual(1);
  expect(positions.body).toBeLessThan(positions.box);

  // In a header of several rows, a header's column counts the spans above it.
  await page.getByRole('button', { name: 'Single' }).click();
  await page.getByRole('button', { name: 'Single' }).click();
  expect((await column(page, 1)).slice(0, 3)).toEqual(['29', '28', '27']);
});

test('loading marks the table busy and dims its rows', async ({ page }) => {
  await mount(page, PEOPLE);
  const table = page.locator('#table > table');
  await expect(table).not.toHaveAttribute('aria-busy');
  await page.locator('#table').evaluate((host) => host.setAttribute('loading', ''));
  await expect(table).toHaveAttribute('aria-busy', 'true');
  await expect(page.locator('#table tbody')).toHaveCSS('opacity', '0.5');
  await page.locator('#table').evaluate((host) => host.removeAttribute('loading'));
  await expect(table).not.toHaveAttribute('aria-busy');
});

test('figures line up at the end in tabular digits, and names, figures, and dates do not wrap', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 700 });
  await mount(page, PEOPLE);
  const amount = page.locator('#table tbody tr').first().locator('td').first();
  await expect(amount).toHaveCSS('text-align', 'end');
  await expect(amount).toHaveCSS('font-variant-numeric', 'tabular-nums');
  await expect(amount).toHaveCSS('white-space', 'nowrap');
  await expect(page.locator('#table tbody th').first()).toHaveCSS('white-space', 'nowrap');
  await expect(page.locator('#table tbody time').first()).toHaveCSS('white-space', 'nowrap');

  // In a numeric column the indicator sits before the label, so the label
  // lines up with the figures.
  const header = page.getByRole('button', { name: 'Balance' });
  await expect(header).toHaveCSS('flex-direction', 'row-reverse');
  const [label, figure] = await Promise.all([
    header.locator('[data-table-part="label"]').boundingBox(),
    amount.boundingBox(),
  ]);
  const padding = await amount.evaluate((cell) => parseFloat(getComputedStyle(cell).paddingRight));
  expect(Math.abs((label.x + label.width) - (figure.x + figure.width - padding))).toBeLessThanOrEqual(1);
});

test('the sort button fills its cell and draws its focus ring inside it', async ({ page }) => {
  await mount(page, PEOPLE);
  const header = page.getByRole('columnheader', { name: 'Name' });
  const button = header.getByRole('button');
  const [cell, control] = await Promise.all([header.boundingBox(), button.boundingBox()]);
  expect(Math.abs(cell.width - control.width)).toBeLessThanOrEqual(1);
  expect(Math.abs(cell.height - control.height)).toBeLessThanOrEqual(1);

  await page.locator('#background').focus();
  await page.keyboard.press('Tab');
  await expect(button).toBeFocused();
  await expect(button).toHaveCSS('outline-offset', '-2px');
});

test('a hovered row reads against the surface it is on, in both themes', async ({ page }) => {
  for (const theme of ['light', 'dark']) {
    await mount(page, `
      ${PEOPLE}
      <aihio-card><aihio-card-content>${PEOPLE.replace('id="table"', 'id="carded"')}</aihio-card-content></aihio-card>
    `, { theme });
    for (const [id, surface] of [['table', 'body'], ['carded', 'aihio-card']]) {
      const row = page.locator(`#${id} tbody tr`).first();
      await row.hover();
      await row.evaluate((element) => Promise.all(element.getAnimations().map((animation) => animation.finished)));
      const [hovered, behind] = await Promise.all([
        row.evaluate((element) => getComputedStyle(element).backgroundColor),
        page.locator(surface).first().evaluate((element) => getComputedStyle(element).backgroundColor),
      ]);
      expect(hovered, `${theme} ${id}`).not.toBe('rgba(0, 0, 0, 0)');
      expect(hovered, `${theme} ${id}`).not.toBe(behind);
    }
  }
});

for (const theme of ['light', 'dark']) {
  test(`sorted, overflowing, and sticky tables have no automated accessibility violations (${theme})`, async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 700 });
    await mount(page, `
      ${PEOPLE}
      <aihio-table id="sticky" density="compact" sticky-header style="--aihio-table-max-height: 10rem">
        <table>
          <caption>Requests</caption>
          <thead><tr><th scope="col" data-sortable>Path</th><th scope="col" data-sortable data-numeric>Status</th></tr></thead>
          <tbody>${Array.from({ length: 12 }, (_, index) => `<tr><td>/api/items/${index}</td><td data-numeric>${200 + index}</td></tr>`).join('')}</tbody>
        </table>
      </aihio-table>
    `, { theme });
    await page.getByRole('button', { name: 'Name' }).click();
    await page.locator('#table').evaluate((host) => host.setAttribute('loading', ''));
    await page.locator('#table').evaluate((host) => host.removeAttribute('loading'));
    await expect(page.locator('#sticky')).toHaveAttribute('role', 'region');

    const results = await new AxeBuilder({ page }).include('#fixture').analyze();
    expect(results.violations.map(({ id, nodes }) => ({ id, targets: nodes.map((node) => node.target) }))).toEqual([]);
  });
}

test('a sortable header keeps its width when the button arrives', async ({ page }) => {
  // The stylesheet without the module: server-rendered markup before upgrade.
  await page.goto('/test/playwright/css-only.html');
  await page.locator('#fixture').evaluate((root, html) => { root.innerHTML = html; }, PEOPLE);
  const before = await page.locator('#table thead th').evaluateAll((cells) => cells.map((cell) => Math.round(cell.getBoundingClientRect().width)));

  await page.addScriptTag({ url: '/dist/aihio.js', type: 'module' });
  await page.evaluate(() => customElements.whenDefined('aihio-table'));
  await expect(page.locator('#table [data-table-part="sort"]')).toHaveCount(4);
  const after = await page.locator('#table thead th').evaluateAll((cells) => cells.map((cell) => Math.round(cell.getBoundingClientRect().width)));
  for (const [index, width] of after.entries()) expect(Math.abs(width - before[index]), `column ${index}`).toBeLessThanOrEqual(1);
});
