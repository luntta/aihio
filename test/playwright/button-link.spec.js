import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

async function render(page, markup) {
  await page.goto('/test/playwright/fixture.html');
  await page.locator('#fixture').evaluate(async (root, html) => {
    root.innerHTML = html;
    await customElements.whenDefined('aihio-button');
  }, markup);
}

test('an authored <a> is the control: a link, drawn as the button, with no <button> created', async ({ page }) => {
  await render(page, `
    <aihio-button id="cta" aria-describedby="note"><a href="#pricing">See pricing</a></aihio-button>
    <p id="note">Plans from 5 euros a month.</p>
    <section id="pricing">Pricing</section>
  `);

  const link = page.getByRole('link', { name: 'See pricing' });
  await expect(link).toHaveAccessibleDescription('Plans from 5 euros a month.');
  expect(await page.locator('#cta button').count()).toBe(0);

  const styles = await page.locator('#cta').evaluate((host) => {
    const control = host.querySelector('a');
    const hostStyle = getComputedStyle(host);
    const controlStyle = getComputedStyle(control);
    const reference = document.createElement('aihio-button');
    reference.textContent = 'Reference';
    host.after(reference);
    const buttonStyle = getComputedStyle(reference.querySelector('button'));
    const result = {
      hostDisplay: hostStyle.display,
      display: controlStyle.display,
      height: controlStyle.height,
      background: controlStyle.backgroundColor,
      color: controlStyle.color,
      decoration: controlStyle.textDecorationLine,
      buttonHeight: buttonStyle.height,
      buttonBackground: buttonStyle.backgroundColor,
      buttonColor: buttonStyle.color,
    };
    reference.remove();
    return result;
  });
  expect(styles.hostDisplay).toBe('contents');
  expect(styles.display).toBe('inline-flex');
  expect(styles.decoration).toBe('none');
  expect(styles.height).toBe(styles.buttonHeight);
  expect(styles.background).toBe(styles.buttonBackground);
  expect(styles.color).toBe(styles.buttonColor);

  await link.click();
  await expect(page).toHaveURL(/#pricing$/);
});

test('a disabled or loading link leaves the tab order and cannot be followed', async ({ page }) => {
  await render(page, `
    <aihio-button id="cta" disabled><a href="#pricing">See pricing</a></aihio-button>
    <section id="pricing">Pricing</section>
  `);

  const link = page.locator('#cta a');
  await expect(link).toHaveAttribute('aria-disabled', 'true');
  await expect(link).toHaveAttribute('tabindex', '-1');

  await link.dispatchEvent('click');
  expect(page.url()).not.toContain('#pricing');

  await page.locator('#cta').evaluate((host) => {
    host.removeAttribute('disabled');
    host.setAttribute('loading', '');
  });
  await expect(link).toHaveAttribute('aria-busy', 'true');
  await expect(link).toHaveAttribute('aria-disabled', 'true');

  await page.locator('#cta').evaluate((host) => host.removeAttribute('loading'));
  await expect(link).not.toHaveAttribute('aria-disabled');
  await expect(link).not.toHaveAttribute('tabindex');
  await link.click();
  await expect(page).toHaveURL(/#pricing$/);
});

test('form and command attributes are not forwarded to a link', async ({ page }) => {
  await render(page, `<aihio-button id="cta" type="submit" name="go" command="--open" commandfor="x"><a href="#pricing">Go</a></aihio-button>`);
  const attributes = await page.locator('#cta a').evaluate((link) => link.getAttributeNames().sort());
  expect(attributes).toEqual(['href']);
});

test('before the module loads, an authored link or button is drawn as the button and the host steps aside', async ({ page }) => {
  await page.goto('/test/playwright/css-only.html');
  const shapes = await page.evaluate(() => {
    const read = (selector) => {
      const style = getComputedStyle(document.querySelector(selector));
      return { display: style.display, height: style.height, border: style.borderTopWidth };
    };
    return {
      hostDrawn: read('#host-drawn'),
      linkHost: read('#link'),
      link: read('#link > a'),
      buttonHost: read('#authored-button'),
      button: read('#authored-button > button'),
      defined: Boolean(customElements.get('aihio-button')),
    };
  });

  expect(shapes.defined).toBe(false);
  expect(shapes.hostDrawn.display).toBe('inline-flex');
  expect(shapes.linkHost.display).toBe('contents');
  expect(shapes.link.display).toBe('inline-flex');
  expect(shapes.link.height).toBe(shapes.hostDrawn.height);
  expect(shapes.buttonHost.display).toBe('contents');
  expect(shapes.button.display).toBe('inline-flex');
});

test('link buttons have no automated accessibility violations', async ({ page }) => {
  await render(page, `
    <aihio-button><a href="#a">Primary</a></aihio-button>
    <aihio-button variant="outline"><a href="#b">Outline</a></aihio-button>
    <aihio-button variant="link"><a href="#c">Link</a></aihio-button>
    <aihio-button disabled><a href="#d">Disabled</a></aihio-button>
  `);
  const results = await new AxeBuilder({ page }).include('#fixture').analyze();
  expect(results.violations).toEqual([]);
});
