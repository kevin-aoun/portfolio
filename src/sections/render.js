// Certifications, projects, writing, work, contact and the footer, rendered to static HTML at build time (vite.config.js)
// and by the bench in dev/sections.html. Their look lives in styles/sections.css, their motion in motion.js.
import { fieldMarkup } from '../footer/field.js';
import { person, work, credentials, certifications, projects, writing, pricing, idNote } from '../content.js';
import { tokenMarkup, tokenSwitch } from '../tokens.js';
import { cost } from '../contact.js';

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const ext = (href) => (href.startsWith('http') ? ' target="_blank" rel="noopener"' : '');
// A link out, as on Kevin's blog: Lucide's arrow-up-right, then the name.
const out = (href, label) => `<a class="ln" href="${href}"${ext(href)}><svg class="ln-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 7h10v10"/><path d="M7 17 17 7"/></svg><span>${esc(label)}</span></a>`;

// ---- Work: the roles as a profiler trace (one row per organisation, like an Nsight Systems timeline),
// then the same roles as a list, and the credentials.
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const month = (ym) => { const [y, m] = ym.split('-').map(Number); return y * 12 + m - 1; };
const named = (t) => `${MON[t % 12]} ${Math.floor(t / 12)}`;
export const dates = ({ from, to }) => {
  const a = month(from);
  if (!to) return `${named(a)} – now`;
  const b = month(to);
  return Math.floor(a / 12) === Math.floor(b / 12) ? `${MON[a % 12]} – ${named(b)}` : `${named(a)} – ${named(b)}`;
};

// shortcut: "now" is the day the page was built, so the trace's right edge moves only when the site is rebuilt.
const today = new Date();
const NOW = today.getFullYear() * 12 + today.getMonth() + today.getDate() / 31;
// A role runs to the end of its last month, but never past the start of the next role at the same place.
const end = (w) => Math.min(w.to ? month(w.to) + 1 : NOW, ...work.filter((n) => n.org === w.org && month(n.from) > month(w.from)).map((n) => month(n.from)));
const T0 = Math.min(...work.map((w) => month(w.from)));
const T1 = Math.max(...work.map(end));
const pc = (d) => `${((d / (T1 - T0)) * 100).toFixed(2)}%`;
const years = [];
for (let y = Math.ceil(T0 / 12); y * 12 < T1 - 2; y++) years.push(y); // no year tick crowding "Now"

// The label is the bar's sibling so it can move beside or above a bar too short to hold it (motion.js).
const bar = ([i, w]) => {
  const at = `data-job="${i}" style="--x:${pc(month(w.from) - T0)};--w:${pc(end(w) - month(w.from))}"`, now = w.to ? '' : ' now';
  return `<span class="tbar${now}" ${at} title="${esc(`${w.role}, ${w.org}, ${dates(w)}`)}"></span><span class="tl${now}" ${at}>${esc(w.short ?? w.role)}</span>`;
};
const orgs = [...new Set(work.map((w) => w.org))];
// Each organisation has its own token colour, in order, the way a tokenizer colours consecutive tokens.
const hue = (org) => `--hue:var(--c${orgs.indexOf(org) % 5})`;
const bands = years.map((y) => `<i style="--x:${pc(Math.max(T0, y * 12) - T0)};--w:${pc(Math.min(T1, y * 12 + 12) - Math.max(T0, y * 12))}"></i>`).join('');

// The list below carries every fact, so the drawing is hidden from screen readers.
const trace = () => `
  <div class="trace" data-ui aria-hidden="true" style="--rows:${orgs.length}">
    <div class="truler">${years.map((y) => `<span style="--x:${pc(y * 12 - T0)}">${y}</span>`).join('')}<span class="tnow">Now</span></div>
    ${orgs.map((o) => `<p class="torg">${esc(o)}</p><div class="ttrack" style="${hue(o)}">${bands}${[...work.entries()].reverse().filter(([, w]) => w.org === o).map(bar).join('')}</div>`).join('')}
  </div>`;

export const workSection = () => `
<section class="sec sec-work" id="work" aria-labelledby="work-title">
  <h2 id="work-title">Work</h2>
  ${trace()}
  <div class="work-body">
    <ol class="jobs">${work.map((w, i) => `
      <li class="job" data-job="${i}" style="${hue(w.org)}">
        <p class="job-when">${dates(w)}</p>
        <div>
          <p class="job-role"><strong>${esc(w.role)}</strong><span class="sr-only">, </span><span class="job-org">${esc(w.org)}</span></p>
          <p class="job-what">${esc(w.what)}${w.href ? ` <a href="${w.href}"${ext(w.href)}>${esc(w.linkText)}</a>` : ''}</p>
        </div>
      </li>`).join('')}
    </ol>
    <div class="creds">
      <h3>Credentials</h3>
      <ul>${credentials.map((c) => `<li><strong>${esc(c.name)}</strong> <span>${esc(c.where)}</span></li>`).join('')}</ul>
    </div>
  </div>
</section>`;

// ---- Certifications: each with its badge; one without a badge shows its issuer's initials in a ring of its
// token colour instead (never a made-up badge). The name is in the text, so the badge image is decorative.
const initials = (s) => s.split(/\s+/).filter((w) => /^[A-Z]/.test(w)).map((w) => w[0]).join('').slice(-3); // NVIDIA Deep Learning Institute: DLI
export const certificationsSection = () => `
<section class="sec sec-certs" id="certifications" aria-labelledby="certs-title">
  <h2 id="certs-title">Certifications</h2>
  <ul class="certs hues">${certifications.map((c) => `
    <li class="cert">
      ${c.badge ? `<img class="cert-badge" src="${c.badge}" alt="" width="152" height="152" loading="lazy" decoding="async">` : `<span class="cert-badge cert-ring" aria-hidden="true">${esc(initials(c.issuer))}</span>`}
      <p class="cert-name">${esc(c.name)}</p>
      <p class="cert-meta">${esc(c.issuer)}${c.date ? ` · ${esc(c.date)}` : ''}</p>
      ${c.href ? `<a class="cert-verify" href="${c.href}"${ext(c.href)}>Verify<span class="sr-only"> ${esc(c.name)}</span></a>` : ''}
    </li>`).join('')}
  </ul>
</section>`;

// ---- Projects: a title card for each, drawn from what the project does. 480 × 300 units; colour comes from
// classes in sections.css (fa, fm, ff, ft fill in the project's token colour, muted, faint or one tone up; sa, sm, sf stroke).
const r1 = (v) => Math.round(v * 10) / 10;
const ART = {
  // Two years of a household's money: monthly spending under net worth, the stepped line, all in one file.
  LocalFi() {
    let out = '', d = '', nw = 196;
    for (let i = 0; i < 24; i++) {
      const x = 40 + i * 17, spend = 20 + ((i * 37) % 23) + (i % 6 === 5 ? 22 : 0);
      out += `<rect class="ff" x="${x}" y="${262 - spend}" width="10" height="${spend}" rx="1.5"/>`;
      nw -= 4 + ((i * 13) % 7) - (i % 6 === 5 ? 9 : 0);
      d += `${i ? 'V' : `M${x} `}${nw}H${x + 17}`;
    }
    return `${out}<path class="sa" d="${d}" stroke-width="4" stroke-linejoin="round"/><circle class="fa" cx="448" cy="${nw}" r="7"/>`;
  },
  // Six channels of EEG, one of them in a motor-imagery burst, feeding one base model with three small
  // adapters on top: the one for this task plugged in, the other two waiting.
  HELIN() {
    let out = '';
    for (let c = 0; c < 6; c++) {
      const y0 = 58 + c * 37, burst = c === 2;
      let d = '';
      for (let x = 30; x <= 300; x += 3) {
        const a = burst ? 4 + 13 * Math.exp(-(((x - 190) / 46) ** 2)) : 5;
        const v = Math.sin(x * 0.21 + c * 1.3) * 0.6 + Math.sin(x * 0.53 + c * 2.1) * 0.3 + Math.sin(x * 0.11 + c) * 0.4;
        d += `${x === 30 ? 'M' : 'L'}${x} ${r1(y0 + v * a)}`;
      }
      out += `<path class="${burst ? 'sa' : 'sm'}" d="${d}" stroke-width="${burst ? 3 : 2}" stroke-linejoin="round"/>`;
    }
    out += '<rect class="fm" x="330" y="122" width="120" height="112" rx="12"/>';
    out += '<rect class="ff" x="338" y="66" width="30" height="36" rx="6"/><rect class="fa" x="375" y="90" width="30" height="36" rx="6"/><rect class="ff" x="412" y="66" width="30" height="36" rx="6"/>';
    return out;
  },
  // A handwritten digit goes through a small network, which sets the rotation of every gate in a fixed
  // three-qubit circuit at once.
  'Quantum state preparation'() {
    const seven = ['1111110', '0000011', '0000110', '0001100', '0011000', '0110000', '0110000'];
    let out = '';
    seven.forEach((row, y) => [...row].forEach((v, x) => { out += `<rect class="${v === '1' ? 'fa' : 'ft'}" x="${22 + x * 9}" y="${118 + y * 9}" width="8" height="8" rx="1.5"/>`; }));
    const layers = [[118, 4], [168, 5], [218, 3]].map(([x, n]) => Array.from({ length: n }, (_, k) => [x, 150 + (k - (n - 1) / 2) * 34]));
    for (let l = 0; l < 2; l++) for (const [x0, y0] of layers[l]) for (const [x1, y1] of layers[l + 1]) out += `<path class="sf" d="M${x0} ${r1(y0)}L${x1} ${r1(y1)}" stroke-width="1.5"/>`;
    for (const L of layers) for (const [x, y] of L) out += `<circle class="fm" cx="${x}" cy="${r1(y)}" r="7"/>`;
    const wires = [100, 150, 200];
    out += wires.map((y) => `<path class="sm" d="M262 ${y}H458" stroke-width="2.5"/>`).join('');
    out += layers[2].map(([x, y], k) => `<path class="sa" d="M${x + 9} ${r1(y)}C${x + 30} ${r1(y)} 262 ${wires[k]} 284 ${wires[k] - 12}" stroke-width="2" stroke-dasharray="1 6" stroke-linecap="round"/>`).join('');
    for (const gx of [298, 382]) out += wires.map((y) => `<rect class="fa" x="${gx - 13}" y="${y - 13}" width="26" height="26" rx="5"/>`).join('');
    for (const [cx, a, b] of [[340, 100, 150], [424, 150, 200]]) out += `<path class="sm" d="M${cx} ${a}V${b + 9}" stroke-width="2.5"/><circle class="fm" cx="${cx}" cy="${a}" r="5"/><circle class="sm" cx="${cx}" cy="${b}" r="9" stroke-width="2.5"/>`;
    return out;
  },
};
// A project with no drawing yet still gets a card: its initial, large.
// The live avatar is drawn live, as the orb on its own stage (src/sections/orb.js).
const art = (p, cls) => p.name === 'Live avatar' ? `<canvas class="art orb${cls}" aria-hidden="true"></canvas>` : `<svg class="art${cls}" viewBox="0 0 480 300" aria-hidden="true" focusable="false">${ART[p.name]?.() ?? `<text class="fa" x="240" y="196" text-anchor="middle" font-size="150" font-weight="600">${esc(p.name[0])}</text>`}</svg>`;
// Where a link goes, said plainly to screen readers and printed on the card without its scheme.
const where = (href) => (href.includes('github.com') ? 'on GitHub' : href.includes('arxiv.org') ? 'the paper on arXiv' : 'opens the project');

export const projectsSection = () => `
<section class="sec sec-projects" id="projects" aria-labelledby="projects-title">
  <h2 id="projects-title">Projects</h2>
  <p class="sec-lead">Off the clock: quantum research with BMW, a brain-computer interface, and tools I build for myself.</p>
  <div class="pj">
    <ul class="pj-list hues">${projects.map((p, i) => `
      <li class="pj-row${i ? '' : ' on'}">
        <p class="pj-head">${p.href ? `<a class="pj-name" href="${p.href}"${ext(p.href)}>${esc(p.name)}<span class="sr-only">, ${where(p.href)}</span></a>` : `<span class="pj-name">${esc(p.name)}</span>`}<span class="pj-meta">${esc(p.kind)} · ${esc(p.lang)}</span></p>
        <p class="pj-text">${esc(p.text)}</p>
        ${art(p, ' pj-inline')}
      </li>`).join('')}
    </ul>
    <div class="pj-dots">${projects.map((p, i) => `<button type="button" aria-label="Show ${esc(p.name)}"${i ? '' : ' aria-current="true"'}></button>`).join('')}</div>
    <div class="pj-stage hues" aria-hidden="true">${projects.map((p, i) => {
      const cls = `pj-card${i ? '' : ' on'}`, body = `${art(p, '')}<p class="pj-title">${esc(p.name)}</p>`;
      // With a repo the card opens it too, out of the tab order: the list's link is the way in for keyboards.
      return p.href
        ? `\n      <a class="${cls}" href="${p.href}"${ext(p.href)} tabindex="-1">${body}<p class="pj-repo">${esc(p.href.replace(/^https:\/\//, ''))}</p></a>`
        : `\n      <div class="${cls}">${body}</div>`;
    }).join('')}
    </div>
  </div>
</section>`;

// ---- Writing: the posts, newest first.
export const writingSection = () => `
<section class="sec sec-writing" id="writing" aria-labelledby="writing-title">
  <h2 id="writing-title">Writing</h2>
  <div class="wr">
    <div class="wr-group">
      <h3>On the blog</h3>
      <ul class="posts hues">${writing.map((w) => `<li><a href="${w.href}"${ext(w.href)}>${esc(w.title)}</a><span class="date">${esc(w.date)}</span></li>`).join('')}</ul>
    </div>
  </div>
</section>`;

// ---- Contact: the composer reads your message the way a model does, in the story's tokenizer view.
// Before anyone types, the view shows the placeholder's tokens, faded, and the counts read 0, as OpenAI's
// tokenizer does for an empty box. These are its o200k_base tokens (js-tiktoken, the tokenizer contact.js
// loads); re-run it if SAMPLE.text changes.
const SAMPLE = {
  text: 'Hi Kevin, I’d like to talk about…',
  tokens: [{ id: 12194, t: 'Hi' }, { id: 29729, t: ' Kevin' }, { id: 11, t: ',' }, { id: 357, t: ' I' }, { id: 8471, t: '’d' }, { id: 1299, t: ' like' }, { id: 316, t: ' to' }, { id: 4595, t: ' talk' }, { id: 1078, t: ' about' }, { id: 1131, t: '…' }],
};

export const contactSection = () => `
<section class="sec sec-contact" id="contact" aria-labelledby="contact-title">
  <h2 id="contact-title">Write to me</h2>
  <p class="ct-lead">Type a message. You’ll see it the way a model reads it, and what reading it costs.</p>
  <div class="ct">
    <form class="composer" action="mailto:${person.email}" method="post" enctype="text/plain">
      <label for="msg">Your message</label>
      <textarea id="msg" name="message" rows="5" placeholder="${esc(SAMPLE.text)}"></textarea>
      <div class="reader sample" data-ui>
        <dl class="counts">
          <div><dt>Tokens</dt><dd data-c="tokens">0</dd></div>
          <div><dt>Characters</dt><dd data-c="chars">0</dd></div>
          <div><dt>Cost to read</dt><dd data-c="cost">${cost(0)}</dd></div>
        </dl>
        <p class="sr-only" role="status" aria-live="polite" data-c="say"></p>
        <p class="tokview" id="msg-tokens">${tokenMarkup(SAMPLE.tokens)}</p>
        <p class="idnote">${esc(idNote)}</p>
        <div class="reader-foot">${tokenSwitch('msg-tokens')}<p class="rate">At an illustrative $${pricing.input} per million input tokens</p></div>
      </div>
      <button class="btn" type="submit">Send by email</button>
      <p class="ct-sent" hidden>Didn’t open? <button type="button">Copy the message</button> and send it to ${person.email}.</p>
    </form>
    <ul class="ct-links hues">
      <li class="ct-call"><a class="btn btn-cta" href="${person.call}"${ext(person.call)}>Book a call</a></li>
      ${person.links.map((l) => `<li>${out(l.href, l.label)}</li>`).join('')}
    </ul>
  </div>
</section>`;

// The footer: a grove of Kevin's tree mark (src/footer/field.js), its one coloured tree right over the ©.
export const footer = () => `
<footer class="foot">
  ${fieldMarkup()}
  <p class="foot-line hues"><span>© ${today.getFullYear()} ${esc(person.name)}, ${esc(person.role)} in Beirut</span></p>
</footer>`;
