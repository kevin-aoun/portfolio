// The live thing: type a message and see it the way a model reads it, in the same tokenizer view as the
// story (a Text / Token IDs switch), with how many tokens and characters it is; then send it by email.
import { person } from './content.js';
import { tokenNodes } from './tokens.js';

const num = (n) => n.toLocaleString('en-US');

export function initContact() {
  const form = document.querySelector('.composer');
  if (!form) return;
  const area = form.querySelector('textarea');
  const reader = form.querySelector('.reader');
  const view = reader.querySelector('.tokview');
  const out = Object.fromEntries([...reader.querySelectorAll('[data-c]')].map((el) => [el.dataset.c, el]));
  const sample = view.innerHTML; // the placeholder's tokens, shown (faded, counted as nothing) while the field is empty
  let worker = null, busy = false, ready = false, timer = 0, sayTimer = 0;

  const counts = (tokens, chars) => { out.tokens.textContent = tokens; out.chars.textContent = chars; };

  // o200k_base is about 1 MB gzipped and slow to unpack, so it loads only once someone is about to write,
  // in a worker, so the field never waits for it.
  const start = () => (worker ??= Object.assign(new Worker(new URL('./contact.worker.js', import.meta.url), { type: 'module' }), { onmessage: read, onerror: fail }));

  function encode() {
    if (busy) return; // one text at a time; the reply sends the field again if it changed meanwhile
    try { start().postMessage(area.value); busy = true; } catch { fail(); }
  }

  function read({ data: { text, ids, pieces } }) {
    busy = false;
    ready = true;
    if (text !== area.value) return update();
    const piece = new Map(ids.map((id, i) => [id, pieces[i]]));
    view.replaceChildren(...tokenNodes(ids, ([id]) => piece.get(id)));
    counts(num(ids.length), num(text.length));
    // Screen readers hear the totals once the typing pauses, not on every key.
    clearTimeout(sayTimer);
    sayTimer = setTimeout(() => { out.say.textContent = `${num(ids.length)} tokens, ${num(text.length)} characters.`; }, 1000);
  }

  function fail() {
    worker?.terminate();
    worker = null; // offline or blocked: the next keystroke tries again
    busy = false;
    view.textContent = 'The tokenizer did not load. Your message will still send.';
    counts('–', num(area.value.length));
  }

  function update() {
    const text = area.value;
    clearTimeout(sayTimer);
    reader.classList.toggle('sample', !text);
    if (!text) {
      view.innerHTML = sample;
      counts('0', '0');
      out.say.textContent = '';
      return;
    }
    // Until the tokenizer is in, the message shows as plain text and only its length is known.
    if (!ready) { view.textContent = text; counts('…', num(text.length)); }
    encode();
  }

  area.addEventListener('focus', () => { try { start(); } catch { /* encode() reports it */ } }, { once: true });
  area.addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(update, 60); });

  // Send opens the visitor's mail app. Where none is set up (webmail, many Linux and Windows machines) the
  // mailto does nothing visible, so a way to copy the message appears under the button.
  const sent = form.querySelector('.ct-sent');
  const copy = sent.querySelector('button');
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    location.href = `mailto:${person.email}?subject=${encodeURIComponent('Hello from your site')}&body=${encodeURIComponent(area.value.trim())}`;
    copy.textContent = 'Copy the message';
    sent.hidden = false;
  });
  copy.addEventListener('click', () => {
    (navigator.clipboard?.writeText(area.value.trim()) ?? Promise.reject(new Error('no clipboard')))
      .then(() => { copy.textContent = 'Copied'; }, () => { area.select(); copy.textContent = 'Selected in the box above'; });
  });
}
