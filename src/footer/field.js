// The footer's grove: rows of Kevin's tree mark, small, filled and upright, fading up from the line of
// links. One mark stays in Kevin's token colour, a signature over the ©. The trees follow the pointer: the
// ones near it lean away from it, pivoting on their trunks, grow a little and glow faintly, and now and then
// one lights up in a token colour instead; then they settle back as it moves on. Every change is eased toward its target, never sprung, so nothing shakes. A tap does the same
// where it lands. The trees grow in from their trunks the first time the footer comes into view.
// The static page already carries the whole grove at rest; this only adds motion.
import { animate, stagger, utils } from 'animejs';
import { MARK_VIEWBOX, MARK_PATH } from './mark.js';

const CELLS = 70 * 5; // five full rows up to 3840 px wide; the grid shows whole marks only and clips the rest

export const fieldMarkup = () => `
<div class="grove" aria-hidden="true">
  <svg class="tf-defs" width="0" height="0"><symbol id="tree-mark" viewBox="${MARK_VIEWBOX.join(' ')}"><path d="${MARK_PATH}"/></symbol></svg>
  <div class="grove-grid">${`<span class="tc"><svg viewBox="${MARK_VIEWBOX.join(' ')}"><use href="#tree-mark"/></svg></span>`.repeat(CELLS)}</div>
</div>`;

export function initField({ reduced }) {
  const root = document.querySelector('.grove');
  if (!root) return;
  const grid = root.querySelector('.grove-grid');
  const all = [...grid.children];
  let cells = [], cols = 0, rows = 0, ctr = [], val = new Float32Array(0), lean = new Float32Array(0), hue = new Int8Array(0), pitch = 56;
  const CHANCE = 0.04; // the share of trees that light up in colour
  const pins = new Map(); // trees clicked on in the secret order (tree → its colour); kept by element so a resize keeps them
  const ORDER = [3, 1, 2, 0, 4];

  // Which marks are actually on screen, and in what grid shape, read from the CSS grid itself.
  function measure() {
    const g = grid.getBoundingClientRect();
    cells.forEach((el) => paint(el, 0, 0));
    cells = all.filter((el) => { const r = el.getBoundingClientRect(); return r.bottom <= g.bottom + 1 && r.right <= g.right + 1; });
    const tops = new Set(cells.map((el) => Math.round(el.offsetTop)));
    rows = tops.size;
    cols = Math.round(cells.length / Math.max(1, rows));
    all.forEach((el) => el.classList.remove('acc'));
    // The signature: the bottom-left tree, straight above the ©.
    cells[(rows - 1) * cols]?.classList.add('acc');
    // Centres in the grove's own box, where the pointer is measured too.
    ctr = cells.map((el) => [el.offsetLeft + el.offsetWidth / 2, el.offsetTop + el.offsetHeight / 2]);
    pitch = cells[0]?.offsetWidth || 56;
    val = new Float32Array(cells.length); lean = new Float32Array(cells.length); hue = new Int8Array(cells.length).fill(-1);
  }
  measure();

  // The entrance: trees grow up from their trunks, outward from the bottom middle (on --in, so it never
  // fights the pointer's lean and swell, which ride on --lean and --grow).
  if (!reduced) {
    utils.set(cells, { '--in': 0 });
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      io.disconnect();
      const from = (rows - 1) * cols + Math.floor(cols / 2);
      animate(cells, { '--in': [0, 1], duration: 600, ease: 'out(4)', delay: stagger(18, { grid: [cols, rows], from }) });
    }, { threshold: 0.3 });
    io.observe(root);
  }

  // One tree's response, v (0 at rest .. 1 under the pointer), its lean (-1 .. 1) and its colour (a token
  // colour 0..4, or -1 for ink). Under reduced motion the trees only light up.
  function paint(el, v, l, h = -1) {
    if (v === 0 && l === 0) { for (const k of ['--lean', '--grow', 'opacity', 'color', 'filter', 'cursor']) el.style.removeProperty(k); return; }
    if (!reduced) { el.style.setProperty('--lean', (l * 22).toFixed(2)); el.style.setProperty('--grow', (1 + 0.16 * v).toFixed(3)); }
    if (pins.has(el) || pins.size === ORDER.length) return; // pinned or gold: colour and glow come from footer.css
    const g = h >= 0 ? (4 / 3) * v : v; // a coloured tree glows a little more
    el.style.filter = `drop-shadow(0 0 ${(6 * g).toFixed(1)}px color-mix(in srgb, currentColor ${Math.round(45 * g)}%, transparent))`;
    if (el.classList.contains('acc')) return; // the signature keeps its colour
    el.style.opacity = (0.14 + (h >= 0 ? 0.86 : 0.72) * v).toFixed(3);
    el.style.cursor = h >= 0 ? 'pointer' : '';
    // Pure colour from a third lit up: mixing with ink any further up washed the colours out.
    if (h >= 0) el.style.color = `color-mix(in oklab, var(--c${h}) ${Math.min(100, Math.round(v * 300))}%, var(--ink))`;
    else el.style.removeProperty('color');
  }

  // Follow the pointer: each tree eases toward how close the pointer is (quickly in, slowly out).
  let px = 0, py = 0, on = false, raf = 0, last = 0, release = 0;
  const smooth = (t) => t * t * (3 - 2 * t);
  function frame(now) {
    const dt = Math.min(64, now - last); last = now;
    const R = pitch * 2.6, rise = 1 - Math.exp(-dt / 30), fall = 1 - Math.exp(-dt / 320);
    let live = false;
    for (let i = 0; i < cells.length; i++) {
      const dx = ctr[i][0] - px, d = on ? Math.hypot(dx, ctr[i][1] - py) : Infinity;
      const t = d < R ? smooth(1 - d / R) : 0;
      const k = t > val[i] ? rise : fall;
      if (t > 0 && val[i] === 0) hue[i] = Math.random() < CHANCE ? Math.floor(Math.random() * 5) : -1; // lit afresh
      val[i] += (t - val[i]) * k;
      lean[i] += ((t > 0 ? Math.max(-1, Math.min(1, dx / R)) * t : 0) - lean[i]) * k; // away from the pointer
      if (t === 0 && val[i] < 0.003) { if (val[i] || lean[i]) { val[i] = 0; lean[i] = 0; hue[i] = -1; paint(cells[i], 0, 0); } continue; }
      live = true;
      paint(cells[i], val[i], lean[i], hue[i]);
    }
    raf = live ? requestAnimationFrame(frame) : 0;
  }
  const wake = () => { if (!raf) { last = performance.now(); raf = requestAnimationFrame(frame); } };
  const point = (e) => { const r = root.getBoundingClientRect(); px = e.clientX - r.left; py = e.clientY - r.top; on = true; wake(); };
  root.addEventListener('pointermove', point, { passive: true });
  root.addEventListener('pointerleave', () => { on = false; wake(); });
  root.addEventListener('pointercancel', () => { on = false; wake(); });
  root.addEventListener('pointerdown', (e) => {
    if (e.button === 0) press(e.target.closest('.tc')); // before point(), so a tap that reveals a colour doesn't also click it
    point(e);
    // A tap has no hover to end it: let go after a moment.
    if (e.pointerType !== 'mouse') { clearTimeout(release); release = setTimeout(() => { on = false; wake(); }, 650); }
  });

  // The grove's secret: click lit colours in the order red, green, amber, purple, blue and each one stays on;
  // the fifth turns the whole grove gold. A wrong one lets them all go, and a red starts over. While gold,
  // no tree shows a colour, so only the five pinned ones answer a click.
  function press(el) {
    const h = pins.get(el) ?? (pins.size < ORDER.length ? hue[cells.indexOf(el)] : -1);
    if (!(h >= 0) || el.classList.contains('acc')) return; // only a tree showing a colour answers
    if (h !== ORDER[pins.size]) {
      for (const p of pins.size === ORDER.length ? cells : pins.keys()) {
        const { color, opacity, filter } = getComputedStyle(p);
        p.classList.remove('pin');
        p.animate([{ color, opacity, filter, offset: 0 }], { duration: 350, easing: 'ease-out' });
      }
      pins.clear();
    }
    if (h === ORDER[pins.size]) {
      pins.set(el, h);
      el.style.setProperty('--pin', `var(--c${h})`);
      el.classList.add('pin');
      const won = pins.size === ORDER.length; // the gold ripples out from this last tree (--d, its delay in ms)
      if (won) utils.set(cells, { '--d': stagger([0, 600], { grid: [cols, rows], from: cells.indexOf(el) }) });
      for (const c of won ? cells : [el]) for (const k of ['opacity', 'color', 'filter', 'cursor']) c.style.removeProperty(k);
    }
    root.classList.toggle('won', pins.size === ORDER.length);
  }

  let t = 0;
  window.addEventListener('resize', () => { clearTimeout(t); t = setTimeout(measure, 200); });
}
