/* Behaviour for the docs site itself. The components it documents are loaded
   separately, from dist/aihio.js; nothing here is part of the package. */

/* Example forms are real forms, which is the point of them: an aihio-button
   inside one is an ordinary submitter. Left alone, submitting one navigated
   the docs page to ?email=…. The submission is caught instead, and what the
   form would have sent is printed under the preview, which shows the form
   participation the components exist to provide. A method="dialog" form does
   not navigate, so it is left to close its dialog as written. */
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

  let output = preview.nextElementSibling;
  if (!output?.matches('.docs-submitted')) {
    output = document.createElement('output');
    output.className = 'docs-submitted';
    output.setAttribute('role', 'status');
    preview.after(output);
  }

  const label = document.createElement('span');
  label.className = 'docs-submitted__label';
  label.textContent = `Submitted · ${form.method.toUpperCase()}`;
  const body = document.createElement('code');
  body.textContent = entries.length > 0 ? entries.join('\n') : '(no named fields)';
  output.replaceChildren(label, body);

  // A real submission would have navigated away and taken the dialog with it.
  form.closest('aihio-dialog')?.close();
});
