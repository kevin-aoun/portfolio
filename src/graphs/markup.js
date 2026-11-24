// The memory chapter: Kevin's 80 GB drawn as a GPU's memory. The chart is drawn here as SVG by pure string
// functions, in its final state, so the page reads without JavaScript; motion.js redraws it at its real size
// and scrubs its moving parts with q. The id and side are the contract with story.js and the scene's camera
// keys.
import { seg, clamp01, memWeightsT, memSkills, MEM_BOX, SKILLS, RESERVE } from './data.js';

export const GRAPHS = [
  {
    id: 'memory', side: 'right', title: 'What fits in 80 GB',
    text: 'I also advise inmind on which GPUs to run, and how to run them for less. Mine holds mostly Python and FastAPI, with hiking and MMA in reserve.',
    legend: true,
    get label() { return `Kevin’s 80 GB, drawn as a GPU’s memory: 16 GB of weights, loaded at birth, then a cache shared by ${SKILLS.map((s) => `${s.name} ${s.pct}%`).join(', ')}, with ${RESERVE.pct}% in reserve for ${RESERVE.holds}.`; },
  },
];

// --- SVG pieces. Coordinates are pixels: the browser draws the chart at its real size. ---
// The static drawing's size, until motion.js redraws it: a phone's chart, so a phone without JavaScript
// sees it 1:1 and a desktop scales it up.
const W = 360, H = 210;
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const n1 = (v) => Math.round(v * 10) / 10;
const op = (o) => (o >= 0.995 ? '' : ` opacity="${Math.round(o * 100) / 100}"`);
const T = (x, y, s, cls, o = 1, anchor = 'start') => (o > 0.005 ? `<text class="${cls}" x="${n1(x)}" y="${n1(y)}"${anchor === 'start' ? '' : ` text-anchor="${anchor}"`}${op(o)}>${s}</text>` : '');
const R = (x, y, w, h, cls, o = 1) => (o > 0.005 && w > 0.05 ? `<rect class="${cls}" x="${n1(x)}" y="${n1(y)}" width="${n1(w)}" height="${n1(h)}"${op(o)}/>` : '');

const BLOCK = 2 * 8;
function memory(w, h) {
  const by = 90, bh = h - by - 34, rows = 8, gap = 1.5, pad = 3, cols = 40;
  const k0 = (MEM_BOX.weights / MEM_BOX.total) * w, pitch = (w - pad - k0) / cols, th = (bh - 2 * pad - (rows - 1) * gap) / rows;
  const spans = SKILLS.map((s) => (s.pct / 5) * BLOCK), all = spans.reduce((a, b) => a + b, 0), k1 = k0 + (all / rows) * pitch;
  const tile = (c, r) => `M${n1(k0 + c * pitch)} ${n1(by + pad + r * (th + gap))}h${n1(pitch - gap)}v${n1(th)}h${n1(gap - pitch)}z`;
  const frame = R(0.5, by + 0.5, w - 1, bh - 1, 'g-box');
  const live = (q) => {
    const s = [], wt = memWeightsT(q), n = Math.round(all * memSkills(q)), ro = seg(q, 0.2, 0.28), ly = by + bh + 24;
    s.push(R(pad + 0.5, by + pad + 0.5, (k0 - pad - gap) * wt - 1, bh - 2 * pad - 1, 'g-wt'));
    let from = 0, now = SKILLS[0];
    SKILLS.forEach((sk, j) => {
      const m = Math.min(spans[j], Math.max(0, n - from));
      let d = '';
      for (let i = 0; i < m; i++) d += tile((from + i - ((from + i) % rows)) / rows, (from + i) % rows);
      if (d) s.push(`<path class="${sk.c}" d="${d}"/>`);
      if (n > from) now = sk;
      from += spans[j];
    });
    s.push(R(k1 + gap, by + pad, w - k1 - gap - pad, bh - 2 * pad, 'g-box', ro));
    // The cache is named in the caption above, so the long weights label has the row to itself on a phone.
    s.push(T(0, ly, 'Weights (loaded at birth) 16 GB', 'g-lab', seg(q, 0.12, 0.2)), T(w, ly, 'Reserve', 'g-lab', ro, 'end'));
    // The big figure counts the weights in, then the cache as it fills; it dips out as it changes meaning.
    const a = clamp01(Math.abs(q - 0.28) / 0.025), cache = q >= 0.28;
    s.push(T(0, 44, cache ? `${Math.round((n * 5) / BLOCK)}%` : `${Math.round(MEM_BOX.weights * wt)} GB`, 'g-num', a));
    s.push(T(0, 72, cache ? (n >= all ? `of the KV cache in use, ${RESERVE.pct}% in reserve` : `of the KV cache, loading ${now.name}`) : 'of weights', 'g-cap', a));
    return s.join('');
  };
  return { frame, live };
}
// The memory chart's key: each skill's colour and share, then the reserve.
const legend = () => `<ul class="g-legend">${SKILLS.map((s) => `<li><i class="${s.c}"></i>${esc(s.name)} ${s.pct}%</li>`).join('')}<li><i class="g-res"></i>Reserve ${RESERVE.pct}% (${esc(RESERVE.holds)})</li></ul>`;

export const chart = (id, w, h) => ({ memory })[id](w, h);
const chartSVG = (g) => { const h = H, c = chart(g.id, W, h); return `<svg viewBox="0 0 ${W} ${h}" preserveAspectRatio="xMinYMid meet" role="img" aria-label="${esc(g.label)}">${c.frame}<g>${c.live(1)}</g></svg>`; };

export const graphPanels = () => GRAPHS.map((g) => `
<article class="panel graph-panel" id="graph-${g.id}" data-beat="graph-${g.id}" data-side="${g.side}">
  <h2 class="ptitle">${esc(g.title)}</h2>
  <p class="ptext">${esc(g.text)}</p>
  <figure class="chart" data-chart="${g.id}" data-ui>${chartSVG(g)}<figcaption>${g.legend ? legend() : esc(g.src)}</figcaption></figure>
</article>`).join('');
