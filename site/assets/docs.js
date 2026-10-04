/* Behaviour for the docs site itself. The components it documents are loaded
   separately, from dist/aihio.js; nothing here is part of the package. */

/* Example forms and links are real, which is the point of them: an
   aihio-button inside a form is an ordinary submitter, and one that wraps an
   <a href> is an ordinary link. Left alone, they navigated the docs page:
   Enter in Button's example 5 went to ?email=…, and an example link to
   /pricing went nowhere that exists. So a submission or a followed link from
   inside a preview is caught, and what it would have done is printed under the
   preview instead. A method="dialog" form and an in-page #fragment link do not
   leave the page, so they are left to behave as written. */
document.addEventListener('submit', (event) => {
  const form = event.target;
  const preview = form.closest('.docs-example__preview');
  if (!preview || form.method === 'dialog') return;

  event.preventDefault();

  const secret = new Set(
    [...form.elements].filter((control) => control.type === 'password').map((control) => control.name)
  );
  const entries = [...new FormData(form, event.submitter)].map(([name, value]) => {
    if (secret.has(name)) return `${name}=${'•'.repeat(String(value).length)}`;
    return `${name}=${typeof value === 'string' ? value : value.name}`;
  });

  report(preview, `Submitted · ${form.method.toUpperCase()}`, entries.length > 0 ? entries.join('\n') : '(no named fields)');

  // A real submission would have navigated away and taken the dialog with it.
  form.closest('aihio-dialog')?.close();
});

document.addEventListener('click', (event) => {
  if (event.defaultPrevented || event.button !== 0) return;
  const link = event.target.closest?.('a[href]');
  const preview = link?.closest('.docs-example__preview');
  if (!preview || link.getAttribute('href').startsWith('#')) return;

  event.preventDefault();
  report(preview, 'Link', `Goes to ${link.getAttribute('href')}`);
});

function report(preview, label, text) {
  let output = preview.nextElementSibling;
  if (!output?.matches('.docs-result')) {
    output = document.createElement('output');
    output.className = 'docs-result';
    output.setAttribute('role', 'status');
    preview.after(output);
  }

  const heading = document.createElement('span');
  heading.className = 'docs-result__label';
  heading.textContent = label;
  const body = document.createElement('code');
  body.textContent = text;
  output.replaceChildren(heading, body);
}

/* Copy buttons, added here rather than in the markup so that without script
   there is no button that does nothing. Every code block gets one; a shared
   status region says when the copy happened, since a changed label alone is
   not reliably announced. */
const copyStatus = document.createElement('p');
copyStatus.className = 'docs-visually-hidden';
copyStatus.setAttribute('role', 'status');
document.body.append(copyStatus);

for (const block of document.querySelectorAll('pre.docs-code')) {
  const wrapper = document.createElement('div');
  wrapper.className = 'docs-codeblock';
  block.before(wrapper);
  wrapper.append(block);

  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'docs-copy';
  button.textContent = 'Copy';
  button.setAttribute('aria-label', 'Copy code');
  wrapper.append(button);
}

document.addEventListener('click', async (event) => {
  const button = event.target.closest?.('.docs-copy');
  if (!button) return;

  const code = button.parentElement.querySelector('code')?.textContent ?? '';
  try {
    await navigator.clipboard.writeText(code);
    button.textContent = 'Copied';
    button.toggleAttribute('data-copied', true);
    copyStatus.textContent = 'Copied to the clipboard';
  } catch {
    button.textContent = 'Copy failed';
  }
  clearTimeout(button._reset);
  button._reset = setTimeout(() => {
    button.textContent = 'Copy';
    button.removeAttribute('data-copied');
    copyStatus.textContent = '';
  }, 1600);
});
