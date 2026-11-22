// The live avatar's card is an orb, as on the avatar's own stage: thinking-orbs (MIT, Jakub Antalik), the
// library its client draws with. Here it acts out a turn of the conversation: it listens, calls a tool
// (the avatar shows a search while one runs), then speaks, with the client's 420 ms crossfade between states.
// The engine is drawn at the canvas's real size, from the 64 px tuning with more dots, as the client does.
import { MODE_FRAMES, paintFrame, resolvePreset } from 'thinking-orbs/engine';

const TURN = [['listening', 3200], ['searching', 2200], ['composing', 3600]];
const CYCLE = TURN.reduce((s, [, ms]) => s + ms, 0);
const FADE = 420, DENSITY = 2.4, FILL = 0.84;
const easeOut = (p) => 1 - (1 - p) ** 3;

// shortcut: thinking-orbs exports scaleCounts only from its React entry, so this is its count part; re-check
// these keys if the package is upgraded.
const PAIRS = [['latRings', 'lonDensity'], ['rings', 'lonDensity'], ['lanes', 'segs']];
const KEYS = ['orbitN', 'ghostN', 'nodeN', 'strandN', 'signals'];
function denser(opts, s) {
  const out = { ...opts }, done = new Set(), rt = Math.sqrt(s);
  for (const [a, b] of PAIRS) {
    if (out[a] == null || out[b] == null || done.has(a) || done.has(b)) continue;
    out[a] = Math.max(2, Math.round(out[a] * rt)); out[b] = Math.max(2, Math.round(out[b] * rt));
    done.add(a); done.add(b);
  }
  for (const k of KEYS) if (out[k] && !done.has(k)) out[k] = Math.max(1, Math.round(out[k] * s));
  if (out.iconD != null) out.iconD = Math.max(0.02, out.iconD * s);
  return out;
}
const presets = Object.fromEntries(TURN.map(([st]) => {
  const p = resolvePreset(st, 64);
  return [st, { ...p, opts: denser(p.opts, DENSITY) }];
}));

// Which state is up at time t, and how far the fade into it has come.
function at(t) {
  let x = t % CYCLE;
  for (let i = 0; i < TURN.length; i++) {
    const [st, ms] = TURN[i];
    if (x < ms) return { st, prev: TURN[(i + TURN.length - 1) % TURN.length][0], p: Math.min(1, x / FADE) };
    x -= ms;
  }
}

export function initOrbs({ reduced }) {
  const canvases = [...document.querySelectorAll('canvas.orb')];
  if (!canvases.length) return;
  const root = document.documentElement;
  const probe = document.createElement('canvas').getContext('2d', { willReadFrequently: true });
  // The dots take the card's colour (its token colour, or the palette's ink in beta); far dots fade towards
  // the ground, which is dark in the dark theme and light in the light one, in beta too.
  const ink = (el) => {
    probe.clearRect(0, 0, 1, 1);
    probe.fillStyle = getComputedStyle(el).color;
    probe.fillRect(0, 0, 1, 1);
    const [r, g, b] = probe.getImageData(0, 0, 1, 1).data;
    return { r, g, b };
  };
  const orbs = canvases.map((el) => ({ el, ctx: el.getContext('2d'), seen: false, w: 0, h: 0, tint: null }));
  const dark = () => root.dataset.theme !== 'light';

  const draw = (o, t) => {
    const { el, ctx, w, h } = o;
    if (!w || !h || (el.closest('.pj-card') && !el.closest('.pj-card.on'))) return;
    o.tint ??= ink(el);
    const dpr = Math.min(2, devicePixelRatio || 1), size = Math.min(w, h) * FILL, d = dark();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    ctx.translate((w - size) / 2, (h - size) / 2);
    const { st, prev, p } = reduced ? { st: 'composing', p: 1 } : at(t);
    const paint = (state, alpha) => {
      const { mode, speed, opts } = presets[state];
      ctx.globalAlpha = alpha;
      paintFrame(ctx, MODE_FRAMES[mode](size, (reduced ? 0.6 : t / 1000) * speed, opts), d, o.tint);
    };
    if (p < 1) paint(prev, 1 - easeOut(p));
    paint(st, easeOut(p));
    ctx.globalAlpha = 1;
  };

  let raf = 0;
  const loop = (now) => {
    raf = 0;
    for (const o of orbs) if (o.seen) draw(o, now);
    if (!reduced && orbs.some((o) => o.seen) && document.visibilityState !== 'hidden') raf = requestAnimationFrame(loop);
  };
  const kick = () => { if (!raf) raf = requestAnimationFrame(loop); };

  const ro = new ResizeObserver((es) => es.forEach((e) => {
    const o = orbs.find((x) => x.el === e.target), dpr = Math.min(2, devicePixelRatio || 1);
    o.w = e.contentRect.width; o.h = e.contentRect.height;
    o.el.width = Math.round(o.w * dpr); o.el.height = Math.round(o.h * dpr);
    kick();
  }));
  const io = new IntersectionObserver((es) => { es.forEach((e) => { orbs.find((x) => x.el === e.target).seen = e.isIntersecting; }); kick(); });
  for (const o of orbs) { ro.observe(o.el); io.observe(o.el); }
  // A new theme, look or palette changes the ink; the card switching on needs a still frame under reduced motion.
  new MutationObserver(() => { orbs.forEach((o) => { o.tint = null; }); kick(); })
    .observe(root, { attributes: true, attributeFilter: ['data-theme', 'data-look'] });
  new MutationObserver(kick).observe(document.querySelector('.pj-stage') ?? root, { attributes: true, subtree: true, attributeFilter: ['class'] });
  document.addEventListener('visibilitychange', kick);
}
