import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

async function render(page, markup) {
  await page.goto('/test/playwright/fixture.html');
  await page.locator('#fixture').evaluate(async (root, html) => {
    root.innerHTML = html;
    await customElements.whenDefined('aihio-switch');
  }, markup);
}

const settingsForm = `
  <form id="settings">
    <fieldset id="group">
      <aihio-field>
        <label slot="label">Email notifications</label>
        <aihio-switch id="email" name="email" checked></aihio-switch>
        <span slot="description">A digest of activity, sent weekly.</span>
      </aihio-field>
      <aihio-field>
        <label slot="label">Weekly summary</label>
        <aihio-switch id="summary" name="summary" value="yes"></aihio-switch>
      </aihio-field>
    </fieldset>
  </form>
`;

test('a switch in aihio-field is a named, described switch beside its label', async ({ page }) => {
  await render(page, settingsForm);
  const email = page.getByRole('switch', { name: 'Email notifications' });
  await expect(email).toBeChecked();
  await expect(email).toHaveAccessibleDescription('A digest of activity, sent weekly.');

  const label = await page.getByText('Email notifications', { exact: true }).boundingBox();
  const control = await email.boundingBox();
  expect(control.x).toBeGreaterThan(label.x + label.width);
  expect(Math.abs((control.y + control.height / 2) - (label.y + label.height / 2))).toBeLessThan(8);

  // Clicking the label flips the switch, as a label does for a checkbox.
  await page.getByText('Weekly summary', { exact: true }).click();
  await expect(page.getByRole('switch', { name: 'Weekly summary' })).toBeChecked();
});

test('a switch submits, resets, and is disabled by its fieldset natively', async ({ page }) => {
  await render(page, settingsForm);
  const entries = () => page.locator('#settings').evaluate((form) => [...new FormData(form)]);

  expect(await entries()).toEqual([['email', 'on']]);

  const changes = [];
  await page.exposeFunction('recordChange', (checked) => changes.push(checked));
  await page.locator('#summary').evaluate((host) => {
    host.addEventListener('aihio-change', (event) => globalThis.recordChange(event.detail.checked));
  });
  await page.getByRole('switch', { name: 'Weekly summary' }).focus();
  await page.keyboard.press('Space');
  expect(await entries()).toEqual([['email', 'on'], ['summary', 'yes']]);
  await expect.poll(() => changes).toEqual([true]);

  // Live state never rewrites the checked attribute, which is the reset default.
  expect(await page.locator('#summary').evaluate((host) => host.hasAttribute('checked'))).toBe(false);
  await page.locator('#settings').evaluate((form) => form.reset());
  expect(await entries()).toEqual([['email', 'on']]);

  await page.locator('#group').evaluate((fieldset) => { fieldset.disabled = true; });
  await expect(page.getByRole('switch', { name: 'Email notifications' })).toBeDisabled();
  expect(await entries()).toEqual([]);
});

test('the checked property is live state and the attribute is the default', async ({ page }) => {
  await render(page, '<aihio-switch id="solo" aria-label="Solo"></aihio-switch>');
  const state = await page.locator('#solo').evaluate((host) => {
    host.checked = true;
    const afterProperty = [host.checked, host.hasAttribute('checked')];
    host.defaultChecked = false;
    host.setAttribute('checked', '');
    return { afterProperty, afterAttribute: host.control.checked, control: host.control.getAttribute('role') };
  });
  expect(state).toEqual({ afterProperty: [true, false], afterAttribute: true, control: 'switch' });
});

test('switches have no automated accessibility violations, on or off', async ({ page }) => {
  await render(page, settingsForm);
  const results = await new AxeBuilder({ page }).include('#fixture').analyze();
  expect(results.violations).toEqual([]);
});
