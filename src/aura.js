// The aura: warm light behind everything, the way a lit chip glows through glass. Five lights, one per
// colour, each a round pool somewhere on the screen: full in its body, falling off over a firm edge
// (exp(-2.5 q^3), q = (d/r)^2), not a wide haze. During the story the 3D stage places them around its
// subject, in each beat's own colours (STAGE); below it, the sections set theirs as they scroll by (PAGE).
// The page draws them on a small fixed canvas behind everything, scaled up so they stay smooth; the stage
// draws the same lights on its own ground, so the two meet without a seam. On the dark page the light is
// added (screen); on paper it is a tint, multiplied in, like a wash.

// Colours, warm: red and yellow lead, pink comes in as the accent, with an orange red and an amber
// between them. On paper, their soft fills. cap: [knee, ceiling] on the light's
// brightness (luma of what it adds or takes away): past the knee it rolls off toward the ceiling, so the
// aura stays under the outlines and text however the moods pile up.
const AURA = {
  dark: { screen: true, gain: 1, cap: [0.2, 0.36], c: ['#fb2438', '#ffd23f', '#ff4fa3', '#ff5a1f', '#faaa07'] },
  light: { screen: false, gain: 1.7, cap: [0.12, 0.22], c: ['#f0aeac', '#f5e09a', '#f4b2d0', '#f5bba0', '#f2d6a6'] },
};
const N = 5, R = 0, Y = 1, P = 2, O = 3, A = 4;
// Every mood at once: pool size (x radius) and strength (x a). Smaller and brighter is more defined.
const SIZE = 0.85, LOUD = 1.5;

// A mood: [colour, x, y, radius, strength] per light. In STAGE, x and y are offsets (fractions of the
// screen) from where the subject sits; in PAGE they are places on the screen. Radius: a fraction of the
// screen's mean side. A light a mood leaves out fades out where it is, or fades in where it will be.
// The big pools are red, pink or orange; yellow and amber only burn inside them, as a hot core (alone on
// the dark page, a dim yellow reads olive and a dim amber brown).
const CHARTS = [[O, 0, 0.1, 0.42, 0.1], [P, 0.02, -0.18, 0.36, 0.08]]; // the memory chart: the light stays low
const ROBOT = (r) => [[R, -0.15, 0.1, r, 0.15], [Y, 0.02, -0.02, 0.22, 0.18], [P, 0.16, -0.15, r - 0.04, 0.14]];
const STAGE = {
  // The transistor, backlit: red under it, pink over it, burning yellow between them. It breathes with
  // the current (live).
  hero: [[R, -0.14, 0.16, 0.46, 0.3], [Y, 0.08, -0.12, 0.26, 0.32], [P, 0.26, -0.24, 0.36, 0.22]],
  // Zooming out, each scale moves the fire somewhere else.
  logic: [[P, -0.14, -0.12, 0.42, 0.2], [A, -0.04, 0.02, 0.24, 0.24], [R, 0.16, 0.16, 0.4, 0.16]],
  core: [[R, -0.12, 0.14, 0.44, 0.18], [Y, 0.04, 0, 0.22, 0.22], [O, 0.18, -0.14, 0.36, 0.14]],
  die: [[O, 0.14, 0.12, 0.44, 0.16], [Y, 0, 0, 0.22, 0.2], [P, -0.17, -0.14, 0.42, 0.17]],
  package: [[R, -0.11, 0.12, 0.42, 0.16], [A, 0.06, -0.04, 0.22, 0.2], [P, 0.18, -0.15, 0.36, 0.14]],
  board: [[P, 0.14, 0.1, 0.46, 0.16], [Y, 0, -0.02, 0.22, 0.2], [R, -0.17, -0.13, 0.38, 0.14]],
  boot: [[Y, 0, 0.02, 0.24, 0.2], [R, 0.12, -0.1, 0.36, 0.14], [P, -0.14, 0.12, 0.38, 0.13]],
  memory: CHARTS,
  arm: ROBOT(0.46), torso: ROBOT(0.48), legs: ROBOT(0.5),
  brain: [[Y, 0.02, -0.06, 0.24, 0.24], [P, -0.12, 0.12, 0.4, 0.14], [R, 0.12, -0.12, 0.4, 0.14]],
  body: [[R, -0.13, -0.1, 0.5, 0.18], [Y, 0.02, 0, 0.22, 0.16], [P, 0.15, 0.17, 0.48, 0.17]],
  // The name: Kevin is the red token.
  hello: [[R, -0.03, 0.04, 0.42, 0.22], [Y, 0, -0.08, 0.22, 0.14], [P, -0.42, 0.24, 0.52, 0.17]],
};
// Under the sections there is text everywhere, so the light there is only a low wash of red and pink,
// no hot cores.
const PAGE = {
  certs: [[P, 0.82, 0.3, 0.44, 0.14], [R, 0.12, 0.86, 0.42, 0.12]],
  work: [[R, 0.86, 0.18, 0.46, 0.15], [P, 0.08, 0.9, 0.44, 0.13]],
  projects: [[P, 0.8, 0.4, 0.42, 0.15], [R, 0.1, 0.88, 0.42, 0.12]],
  writing: [[R, 0.86, 0.22, 0.42, 0.14], [P, 0.12, 0.84, 0.4, 0.12]],
};

// A mood as five [x, y, r, a]; a light it leaves out has no place (NaN) and no strength.
function toSet(mood, ox = 0, oy = 0, out = new Float32Array(N * 4)) {
  out.fill(NaN);
  for (let i = 0; i < N; i++) out[i * 4 + 3] = 0;
  for (const [h, x, y, r, a] of mood) out.set([ox + x, oy + y, r, a], h * 4);
  return out;
}
function mixSets(A, B, t, out) {
  for (let i = 0; i < N * 4; i += 4) {
    const a = Number.isNaN(A[i]) ? B : A, b = Number.isNaN(B[i]) ? A : B; // fade in or out in place
    for (let k = 0; k < 3; k++) out[i + k] = a[i + k] + (b[i + k] - a[i + k]) * t;
    out[i + 3] = A[i + 3] + (B[i + 3] - A[i + 3]) * t;
  }
  return out;
}
const smooth = (t) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));
const PAGE_SETS = Object.fromEntries(Object.entries(PAGE).map(([k, m]) => [k, toSet(m)]));

// --- what the stage tells it ---
let stageSet = null, stageAt = -1e9;
const sA = new Float32Array(N * 4), sB = new Float32Array(N * 4);
// The stage, each frame: the keys it is between (A/B holds share a mood), how far, and where its subject is.
export function stageAura(idA, idB, t, fx, fy) {
  const m = (id) => STAGE[id.replace(/[AB]$/, '')] ?? STAGE.hero;
  stageSet = mixSets(toSet(m(idA), fx, fy, sA), toSet(m(idB), fx, fy, sB), t, stageSet ?? new Float32Array(N * 4));
  out.at = -1;
  stageAt = performance.now();
}
// The transistor's current (0 or 1): the light breathes up while it flows.
export const current = { on: 0 };
// The robot's light-up: every light runs through the first five colours, fast, then settles.
let sweepAt = -1e9;
export function sweepAura(now) { sweepAt = now; }

// --- the lights, as both canvases draw them: x, y, r in CSS px from the screen's top left, a; colours ---
const out = { L: new Float32Array(N * 4), C: new Float32Array(N * 3), at: -1, screen: true, cap: AURA.dark.cap };
let theme = AURA.dark, cols = [], W = 1, H = 1, reduced = false, breath = 0, last = 0;
let anchors = [], story = null, cover = null;
const mixed = new Float32Array(N * 4);
const FALLBACK = toSet(STAGE.hero, 0.5, 0.5);

function setTheme(name) {
  theme = AURA[name] ?? AURA.dark;
  // Each colour as what it does to the ground: light added on the dark page, a tint taken away on paper.
  cols = theme.c.map((h) => [1, 3, 5].map((k) => parseInt(h.slice(k, k + 2), 16) / 255).map((v) => (theme.screen ? v : 1 - v) * theme.gain));
  out.screen = theme.screen;
  out.cap = theme.cap;
  out.at = -1;
}

// Below the story, the sections' moods follow the scroll: each section's own at its anchor (a little into
// it), mixed between neighbours, starting from wherever the stage left its lights.
function pageSet() {
  const line = H * 0.6, from = stageSet ?? FALLBACK;
  const end = story ? story.getBoundingClientRect().bottom : -Infinity;
  if (end >= line) return from;
  const room = document.documentElement.scrollHeight - scrollY - H * 0.4 - 1; // the lowest the line can reach
  let y0 = end, s0 = from;
  for (const [el, key] of anchors) {
    const r = el.getBoundingClientRect(), s1 = PAGE_SETS[key];
    const y1 = Math.max(y0, Math.min(room, r.top + Math.min(r.height / 2, H * 0.3)));
    if (line <= y1) return mixSets(s0, s1, y1 > y0 ? smooth((line - y0) / (y1 - y0)) : 1, mixed);
    y0 = y1; s0 = s1;
  }
  return s0;
}

export function auraAt(now) {
  if (out.at === now) return out;
  const dt = Math.min(100, now - (last || now));
  last = now; out.at = now;
  const set = pageSet(), off = document.documentElement.dataset.look === 'beta'; // beta: flat colour fields, no light
  // The current: up fast, down slowly.
  const target = reduced ? 0 : current.on;
  breath += (target - breath) * (1 - Math.exp(-dt / (target > breath ? 70 : 650)));
  const m = (W + H) / 2, tau = now - sweepAt, STEP = 90, FADE = 420;
  const env = !reduced && tau >= 0 && tau < 5 * STEP + FADE ? (tau < 5 * STEP ? 1 : 1 - (tau - 5 * STEP) / FADE) : 0;
  const sw = env ? cols[Math.min(4, Math.floor(tau / STEP))] : null;
  for (let i = 0; i < N; i++) {
    const j = i * 4;
    // A slow drift, each light on its own unhurried loop.
    const d = reduced ? 0 : now / 1000, p = i * 1.7;
    const x = set[j] + 0.022 * Math.sin(d / (3 + i * 0.37) + p), y = set[j + 1] + 0.026 * Math.cos(d / (3.6 + i * 0.29) + p);
    const r = set[j + 2] * (1 + 0.06 * Math.sin(d / (4.4 + i * 0.5) + p * 2));
    if (Number.isNaN(x)) { out.L.set([0, 0, 1, 0], j); } // no place, no light (and no NaN for the shader)
    else { out.L[j] = x * W; out.L[j + 1] = y * H; out.L[j + 2] = Math.max(1, r * m * SIZE); out.L[j + 3] = off ? 0 : set[j + 3] * LOUD * (1 + 0.45 * breath + 1.1 * env); }
    for (let k = 0; k < 3; k++) out.C[i * 3 + k] = sw ? cols[i][k] + (sw[k] - cols[i][k]) * env : cols[i][k];
  }
  return out;
}

// Film grain behind the content, so the soft light never shows steps: a tile of noise around mid grey,
// overlaid (it shows in the light and vanishes in the black). The stage makes the same in its shader.
function grain() {
  const c = document.createElement('canvas'), S = 256;
  c.width = c.height = S;
  const g = c.getContext('2d'), d = g.createImageData(S, S);
  for (let i = 0; i < d.data.length; i += 4) {
    const v = 128 + ((Math.random() + Math.random() + Math.random()) / 3 - 0.5) * 2 * 40;
    d.data[i] = d.data[i + 1] = d.data[i + 2] = v; d.data[i + 3] = 255;
  }
  g.putImageData(d, 0, 0);
  const el = document.createElement('div');
  el.className = 'grainfx';
  el.setAttribute('aria-hidden', 'true');
  const url = `url(${c.toDataURL()})`;
  el.style.backgroundImage = url;
  document.documentElement.style.setProperty('--grain', url); // beta's blocks carry the same grain (sections.css)
  document.body.append(el);
}

// The page's canvas: one pixel per SCALE CSS px, the ground already lit, scaled up behind everything.
const SCALE = 10;
export function initAura(opts = {}) {
  reduced = !!opts.reduced;
  const canvas = document.createElement('canvas');
  canvas.className = 'aurafx';
  canvas.setAttribute('aria-hidden', 'true');
  document.body.prepend(canvas);
  const g = canvas.getContext('2d', { alpha: false });
  let img = null, bg = [0, 0, 0], raf = 0;
  const gl = document.querySelector('.gl'), lit = new Float64Array(N * 7);
  story = document.querySelector('.story');
  cover = document.querySelector('#contact');
  anchors = [['#certifications', 'certs'], ['#projects', 'projects'], ['#writing', 'writing'], ['#work', 'work']]
    .map(([q, k]) => [document.querySelector(q), k]).filter(([el]) => el);

  function resize() {
    W = innerWidth; H = innerHeight;
    canvas.width = Math.ceil(W / SCALE) + 1; canvas.height = Math.ceil(H / SCALE) + 1;
    canvas.style.width = `${canvas.width * SCALE}px`; canvas.style.height = `${canvas.height * SCALE}px`;
    img = g.createImageData(canvas.width, canvas.height);
    out.at = -1;
    draw(auraAt(performance.now()));
  }
  function colours() {
    const t = document.documentElement.dataset.theme === 'light' ? 'light' : 'dark';
    setTheme(t);
    const hex = getComputedStyle(document.documentElement).getPropertyValue('--bg').trim();
    bg = [1, 3, 5].map((k) => parseInt(hex.slice(k, k + 2), 16) / 255);
    if (img) draw(auraAt(performance.now()));
  }
  // The contact band and the footer under it are surfaces over the aura: the light stops at the band's
  // top edge, and nothing of it shows through them.
  let clip = '';
  function draw(o) {
    if (document.documentElement.dataset.look === 'beta') return; // hidden in beta (base.css)
    const cut = cover ? cover.getBoundingClientRect().top : Infinity, full = canvas.height * SCALE;
    const c = cut < full ? `inset(0 0 ${Math.round(full - Math.max(0, cut))}px 0)` : '';
    if (c !== clip) canvas.style.clipPath = clip = c;
    // Only the rows that show: none under the contact band, none under the 3D stage while it draws (opaque,
    // it lights its own ground). Two rows spare on each side for the smoothing of the upscale.
    let top = 0;
    if (gl?.isConnected && performance.now() - stageAt < 250 && gl.style.opacity === '1') { const r = gl.getBoundingClientRect(); if (r.top <= 0) top = r.bottom; }
    const { width: cw, height: ch } = canvas, px = img.data, [K, cap] = o.cap, kw = cap - K;
    const y0 = Math.max(0, Math.floor(top / SCALE) - 2), y1 = Math.min(ch, Math.ceil(cut / SCALE) + 2);
    if (y0 >= y1) return;
    let n = 0;
    for (let i = 0; i < N; i++) if (o.L[i * 4 + 3] > 0.002) lit.set([o.L[i * 4], o.L[i * 4 + 1], o.L[i * 4 + 2], o.L[i * 4 + 3], o.C[i * 3], o.C[i * 3 + 1], o.C[i * 3 + 2]], 7 * n++);
    let p = y0 * cw * 4;
    for (let y = y0; y < y1; y++) for (let x = 0; x < cw; x++, p += 4) {
      const cx = (x + 0.5) * SCALE, cy = (y + 0.5) * SCALE;
      let r = 0, gg = 0, b = 0;
      for (let j = 0; j < 7 * n; j += 7) {
        const dx = (cx - lit[j]) / lit[j + 2], dy = (cy - lit[j + 1]) / lit[j + 2], q = dx * dx + dy * dy;
        if (q > 3.5) continue; // exp(-2.5 q^3) is below 1e-46 out there: nothing a pixel can show
        const f = lit[j + 3] * Math.exp(-2.5 * q * q * q);
        r += lit[j + 4] * f; gg += lit[j + 5] * f; b += lit[j + 6] * f;
      }
      r = Math.min(1, r); gg = Math.min(1, gg); b = Math.min(1, b);
      const lum = 0.2126 * r + 0.7152 * gg + 0.0722 * b; // the ceiling, as the stage's shader has it
      if (lum > K) { const k = (K + kw * (1 - Math.exp(-(lum - K) / kw))) / lum; r *= k; gg *= k; b *= k; }
      if (o.screen) { r = 1 - (1 - bg[0]) * (1 - r); gg = 1 - (1 - bg[1]) * (1 - gg); b = 1 - (1 - bg[2]) * (1 - b); }
      else { r = bg[0] * (1 - r); gg = bg[1] * (1 - gg); b = bg[2] * (1 - b); }
      px[p] = r * 255 + 0.5; px[p + 1] = gg * 255 + 0.5; px[p + 2] = b * 255 + 0.5; px[p + 3] = 255;
    }
    g.putImageData(img, 0, 0, 0, y0, cw, y1 - y0);
  }
  function loop(now) { draw(auraAt(now)); raf = requestAnimationFrame(loop); }
  // Still, it only redraws when the scroll or the stage moves it.
  const poke = () => { if (reduced && !raf) raf = requestAnimationFrame((t) => { raf = 0; draw(auraAt(t)); }); };
  addEventListener('scroll', poke, { passive: true });
  addEventListener('resize', resize);
  new MutationObserver(colours).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'data-look'] });
  grain();
  colours();
  resize();
  if (!reduced) raf = requestAnimationFrame(loop);
  return { poke };
}
