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
