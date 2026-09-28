import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('existing interaction suite passes', async ({ page }) => {
  await page.goto('/test/browser/index.html');
  await expect(page.locator('body')).toHaveAttribute('data-status', 'pass');
});

test('components survive reconnect and keep private input values out of markup', async ({ page }) => {
  await page.goto('/test/playwright/fixture.html');
  const result = await page.evaluate(async () => {
    await customElements.whenDefined('aihio-toggle');
    const root = document.querySelector('#fixture');
    root.innerHTML = `
      <aihio-toggle id="toggle">Bold</aihio-toggle>
      <aihio-input id="password" type="password" value="default" aria-label="Password"></aihio-input>
    `;
    const toggle = root.querySelector('#toggle');
    toggle.remove();
    root.append(toggle);
    toggle.click();

    const input = root.querySelector('#password');
    input.control.value = 'private-value';
    input.control.dispatchEvent(new Event('input', { bubbles: true }));
    return {
      pressed: toggle.hasAttribute('pressed'),
      value: input.value,
      attribute: input.getAttribute('value'),
      serialized: input.outerHTML,
    };
  });

  expect(result.pressed).toBe(true);
  expect(result.value).toBe('private-value');
  expect(result.attribute).toBe('default');
  expect(result.serialized).not.toContain('private-value');
});

test('interactive descendants and observers still work after reconnect', async ({ page }) => {
  await page.goto('/test/playwright/fixture.html');
  await page.locator('#fixture').evaluate((root) => {
    root.innerHTML = `
      <aihio-tabs id="tabs" value="one">
        <aihio-tab-list><aihio-tab value="one">One</aihio-tab><aihio-tab value="two">Two</aihio-tab></aihio-tab-list>
        <aihio-tab-panel value="one">Panel one</aihio-tab-panel><aihio-tab-panel value="two">Panel two</aihio-tab-panel>
      </aihio-tabs>
      <aihio-dropdown id="menu"><aihio-button slot="trigger">Menu</aihio-button><aihio-dropdown-item>Choose</aihio-dropdown-item></aihio-dropdown>
    `;
    for (const id of ['tabs', 'menu']) {
      const element = root.querySelector(`#${id}`);
      element.remove();
      root.append(element);
    }
  });

  await page.getByText('Two', { exact: true }).click();
  await expect(page.locator('#tabs')).toHaveAttribute('value', 'two');
  await page.getByText('Menu', { exact: true }).click();
  await expect(page.locator('#menu')).toHaveAttribute('open', '');
  await page.getByText('Choose', { exact: true }).click();
  await expect(page.locator('#menu')).not.toHaveAttribute('open', '');
});

test('field labels focus their delegated input', async ({ page }) => {
  await page.goto('/test/playwright/fixture.html');
  await page.locator('#fixture').evaluate((root) => {
    root.innerHTML = `
      <aihio-field>
        <label slot="label">Email</label>
        <aihio-input aria-label="Email"></aihio-input>
      </aihio-field>
    `;
  });
  await page.getByText('Email', { exact: true }).click();
  const focused = await page.evaluate(() => document.activeElement?.tagName === 'INPUT');
  expect(focused).toBe(true);
});

test('delegated form controls expose native ownership, constraints, and submitter data', async ({ page }) => {
  await page.goto('/test/playwright/fixture.html');
  const result = await page.locator('#fixture').evaluate((root) => {
    root.innerHTML = `
      <form id="profile"><aihio-input id="handle" name="handle" value="seed" minlength="3" pattern="[a-z]+" aria-label="Handle"></aihio-input></form>
      <aihio-button id="save" form="profile" type="submit" name="action" value="save" formnovalidate>Save</aihio-button>
    `;
    const form = root.querySelector('#profile');
    const input = root.querySelector('#handle');
    const button = root.querySelector('#save');
    const data = new FormData(form, button.control);
    return {
      buttonOwnsForm: button.form === form,
      inputOwnsForm: input.form === form,
      minLength: input.control.minLength,
      pattern: input.control.pattern,
      formNoValidate: button.control.formNoValidate,
      handle: data.get('handle'),
      action: data.get('action'),
    };
  });

  expect(result).toEqual({
    buttonOwnsForm: true,
    inputOwnsForm: true,
    minLength: 3,
    pattern: '[a-z]+',
    formNoValidate: true,
    handle: 'seed',
    action: 'save',
  });
});

test('nested tabs keep selection inside their owner', async ({ page }) => {
  await page.goto('/test/playwright/fixture.html');
  await page.locator('#fixture').evaluate((root) => {
    root.innerHTML = `
      <aihio-tabs id="outer" value="outer-a">
        <aihio-tab-list><aihio-tab value="outer-a">Outer A</aihio-tab><aihio-tab value="outer-b">Outer B</aihio-tab></aihio-tab-list>
        <aihio-tab-panel value="outer-a">
          <aihio-tabs id="inner" value="inner-a">
            <aihio-tab-list><aihio-tab value="inner-a">Inner A</aihio-tab><aihio-tab value="inner-b">Inner B</aihio-tab></aihio-tab-list>
            <aihio-tab-panel value="inner-a">A</aihio-tab-panel><aihio-tab-panel value="inner-b">B</aihio-tab-panel>
          </aihio-tabs>
        </aihio-tab-panel>
        <aihio-tab-panel value="outer-b">Outer B panel</aihio-tab-panel>
      </aihio-tabs>
    `;
  });
  await page.getByText('Inner B', { exact: true }).click();
  await expect(page.locator('#inner')).toHaveAttribute('value', 'inner-b');
  await expect(page.locator('#outer')).toHaveAttribute('value', 'outer-a');
});

test('dialog and dropdown use native top layers', async ({ page }) => {
  await page.goto('/test/playwright/fixture.html');
  await page.locator('#fixture').evaluate((root) => {
    root.innerHTML = `
      <aihio-dialog id="dialog" aria-label="Example"><button>Inside</button></aihio-dialog>
      <aihio-dropdown id="menu"><aihio-button slot="trigger">Menu</aihio-button><aihio-dropdown-item>Item</aihio-dropdown-item></aihio-dropdown>
    `;
  });

  await page.locator('#dialog').evaluate((dialog) => dialog.open());
  expect(await page.locator('#dialog').evaluate((dialog) => dialog.shadowRoot.querySelector('dialog').matches(':modal'))).toBe(true);
  await page.keyboard.press('Escape');
  await expect(page.locator('#dialog')).not.toHaveAttribute('open', '');

  await page.getByText('Menu', { exact: true }).click();
  if (await page.evaluate(() => 'popover' in HTMLElement.prototype)) {
    expect(await page.locator('#menu').evaluate((menu) => menu.shadowRoot.querySelector('.content').matches(':popover-open'))).toBe(true);
  } else {
    expect(await page.locator('#menu').evaluate((menu) => menu.shadowRoot.querySelector('.content').hasAttribute('data-fallback-open'))).toBe(true);
  }
});

async function openDropdown(page, id) {
  await page.locator(`#${id} [slot="trigger"]`).getByRole('button').click();
  const content = page.locator(`#${id} .content`);
  await expect(content).toBeVisible();
  await content.evaluate((element) => Promise.all(element.getAnimations().map((animation) => animation.finished)));
  return content;
}

test('dropdown menu opens under its trigger, including display: contents triggers', async ({ page }) => {
  await page.setViewportSize({ width: 800, height: 600 });
  await page.goto('/test/playwright/fixture.html');
  await page.locator('#fixture').evaluate((root) => {
    root.innerHTML = `
      <div style="padding: 10rem 20rem">
        <aihio-dropdown id="button-menu">
          <aihio-button slot="trigger">Menu</aihio-button>
          <aihio-dropdown-item>Profile</aihio-dropdown-item>
        </aihio-dropdown>
        <aihio-dropdown id="contents-menu">
          <span slot="trigger" style="display: contents"><button type="button">Other</button></span>
          <aihio-dropdown-item>Settings</aihio-dropdown-item>
        </aihio-dropdown>
      </div>
    `;
  });

  for (const id of ['button-menu', 'contents-menu']) {
    const trigger = page.locator(`#${id} [slot="trigger"]`).getByRole('button');
    const content = await openDropdown(page, id);
    const [triggerBox, contentBox] = await Promise.all([trigger.boundingBox(), content.boundingBox()]);
    expect(contentBox.y, id).toBeGreaterThanOrEqual(triggerBox.y + triggerBox.height);
    expect(Math.abs(contentBox.x - triggerBox.x), id).toBeLessThanOrEqual(2);
    await page.keyboard.press('Escape');
    await expect(content).toBeHidden();
  }
});

test('dropdown item hover reads against the overlay in the dark theme', async ({ page }) => {
  await page.goto('/test/playwright/fixture.html');
  await page.locator('#fixture').evaluate((root) => {
    document.documentElement.dataset.theme = 'dark';
    root.innerHTML = `
      <aihio-dropdown id="menu">
        <aihio-button slot="trigger">Menu</aihio-button>
        <aihio-dropdown-item>Profile</aihio-dropdown-item>
      </aihio-dropdown>
    `;
  });

  const content = await openDropdown(page, 'menu');
  const item = page.locator('aihio-dropdown-item');
  await item.hover();
  await item.evaluate((element) => Promise.all(element.getAnimations().map((animation) => animation.finished)));

  const [itemBackground, overlayBackground] = await Promise.all([
    item.evaluate((element) => getComputedStyle(element).backgroundColor),
    content.evaluate((element) => getComputedStyle(element).backgroundColor),
  ]);
  expect(itemBackground).not.toBe(overlayBackground);
});

test('a highlighted dropdown item keeps visible text in forced colors', async ({ page }) => {
  await page.emulateMedia({ forcedColors: 'active' });
  await page.goto('/test/playwright/fixture.html');
  test.skip(!(await page.evaluate(() => matchMedia('(forced-colors: active)').matches)), 'forced colors emulation unsupported');
  await page.locator('#fixture').evaluate((root) => {
    root.innerHTML = `
      <aihio-dropdown id="menu">
        <aihio-button slot="trigger">Menu</aihio-button>
        <aihio-dropdown-item>Profile <span>⌘P</span></aihio-dropdown-item>
      </aihio-dropdown>
    `;
  });

  await openDropdown(page, 'menu');
  const item = page.locator('aihio-dropdown-item');
  await item.hover();

  // Without the opt-out, the UA draws a Canvas backplate behind the text and
  // HighlightText on it disappears.
  await expect(item).toHaveCSS('forced-color-adjust', 'none');
  await expect(item.locator('span')).toHaveCSS('forced-color-adjust', 'none');
  const { color, backgroundColor } = await item.evaluate(async (element) => {
    await Promise.all(element.getAnimations().map((animation) => animation.finished));
    const style = getComputedStyle(element);
    return { color: style.color, backgroundColor: style.backgroundColor };
  });
  expect(color).not.toBe(backgroundColor);
});

test('stacked dialogs keep scroll locked and support cancelable close', async ({ page }) => {
  await page.goto('/test/playwright/fixture.html');
  await page.locator('#fixture').evaluate((root) => {
    root.innerHTML = `
      <aihio-dialog id="first" aria-label="First"><button>First action</button></aihio-dialog>
      <aihio-dialog id="second" aria-label="Second"><button>Second action</button></aihio-dialog>
    `;
    root.querySelector('#first').open();
    root.querySelector('#second').open();
  });
  await expect(page.locator('body')).toHaveCSS('overflow', 'hidden');

  await page.keyboard.press('Escape');
  await expect(page.locator('#second')).not.toHaveAttribute('open', '');
  await expect(page.locator('#first')).toHaveAttribute('open', '');
  await expect(page.locator('body')).toHaveCSS('overflow', 'hidden');

  const prevented = await page.locator('#first').evaluate((dialog) => {
    dialog.addEventListener('aihio-before-close', (event) => event.preventDefault(), { once: true });
    dialog.close({ reason: 'guarded' });
    return dialog.hasAttribute('open');
  });
  expect(prevented).toBe(true);

  await page.locator('#first').evaluate((dialog) => dialog.close());
  await expect(page.locator('#first')).not.toHaveAttribute('open', '');
  await expect(page.locator('body')).not.toHaveCSS('overflow', 'hidden');
});

test('representative components have no automated accessibility violations', async ({ page }) => {
  await page.goto('/test/playwright/fixture.html');
  await page.locator('#fixture').evaluate((root) => {
    root.innerHTML = `
      <aihio-field><label slot="label">Email</label><aihio-input name="email"></aihio-input></aihio-field>
      <aihio-button>Save</aihio-button>
      <aihio-alert><strong slot="title">Saved</strong></aihio-alert>
    `;
  });
  const results = await new AxeBuilder({ page }).include('#fixture').analyze();
  expect(results.violations).toEqual([]);
});
