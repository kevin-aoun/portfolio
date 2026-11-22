// The tokenizer view, used for the name and the contact form: every token on its own background in the five
// colours of OpenAI's tokenizer, with a Text / Token IDs switch. The markup half runs at build time in Node;
// the switch runs in the browser.

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// One span per token. The text keeps its leading space, as the tokenizer does.
export const tokenMarkup = (list) => list.map((x, i) => `<span class="tk tk${i % 5}" data-id="${x.id}">${esc(x.t)}</span>`).join('');

// The two-way switch that sits under a token view. `target` is the id of the element it controls;
// every token inside that element flips between its text and its ID.
export const tokenSwitch = (target) => `<div class="tokswitch" role="group" aria-label="Show tokens as">
  <button type="button" aria-pressed="true" data-mode="text" aria-controls="${target}">Text</button>
  <button type="button" aria-pressed="false" data-mode="ids" aria-controls="${target}">Token IDs</button>
</div>`;

// Browser: wire every switch on the page to its view.
export function bindTokenSwitches() {
  document.querySelectorAll('.tokswitch').forEach((g) => {
    const buttons = [...g.querySelectorAll('button')];
    buttons.forEach((b) => b.addEventListener('click', () => {
      const view = document.getElementById(b.getAttribute('aria-controls'));
      view?.classList.toggle('show-ids', b.dataset.mode === 'ids');
      buttons.forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    }));
  });
}

// Browser: build token spans from ids (the contact form tokenizes live).
export function tokenNodes(ids, decode) {
  return ids.map((id, i) => {
    const s = document.createElement('span');
    s.className = `tk tk${i % 5}`;
    s.dataset.id = id;
    s.textContent = decode([id]);
    return s;
  });
}
