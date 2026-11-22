// Scroll choreography with anime.js. One timeline, synced to the story's scroll, drives a single
// progress value; everything on stage is a function of it: the camera keys, the panels that alternate
// sides, the name, the marquee and the memory chart. Scrolling back plays it in reverse.
import { createTimeline, onScroll, stagger, splitText, utils } from 'animejs';
import { body } from './content.js';
import { initGraphs } from './graphs/motion.js';
import { look } from './beta.js';

const clamp = (x) => Math.min(1, Math.max(0, x));
// The stylesheets' stacked layout (phones, and phones on their side); scene.js keeps the same test.
const phoneQ = matchMedia('(max-width: 900px), (max-width: 1000px) and (max-height: 500px)');
const inOutSine = (t) => -(Math.cos(Math.PI * t) - 1) / 2;

// The story in screens (svh). A 'move' carries the camera to the next beat while the subject crosses
// the screen; a 'hold' keeps it on one side while that beat's panel is up. A 'flow' move is not eased, so
// the chip builds itself in one continuous pull-out instead of stopping at every scale.
function schedule() {
  const s = [{ kind: 'hold', key: 'hero', len: 70, single: true }];
  // The name, with the transistor beside it.
  s.push({ kind: 'move', len: 60 }, { kind: 'hold', key: 'hello', len: 150, panel: '#hello', single: true, hello: true });
  // Four make a decision; from there the camera keeps pulling out while the chip builds itself, without words.
  s.push({ kind: 'move', len: 190 }, { kind: 'hold', key: 'logic', len: 96, panel: '#beat-logic', callouts: 'logic' });
  for (const [key, len] of [['core', 24], ['die', 24], ['package', 60], ['board', 24]]) s.push({ kind: 'move', len: 64, flow: true }, { kind: 'hold', key, len });
  // "Now it can talk": the chip powers on under one long line read right to left.
  s.push({ kind: 'move', len: 96 }, { kind: 'hold', key: 'boot', len: 320, panel: '#beat-boot', marquee: true });
  // The robot assembles around the chip without words (arms, torso, legs, then the chip into its head); its
  // one line comes as it lights up.
  for (const [key, move, len] of [['arm', 110, 110], ['torso', 64, 100], ['legs', 64, 100], ['brain', 72, 130]]) s.push({ kind: 'move', len: move }, { kind: 'hold', key, len });
  s.push({ kind: 'move', len: 80 }, { kind: 'hold', key: 'body', len: 120, panel: `#beat-${body.id}` });
  // Into the chip in its head: what fills its memory is Kevin's stack. The last panel stays up.
  s.push({ kind: 'move', len: 150 }, { kind: 'hold', key: 'memory', len: 165, panel: '#graph-memory', graph: 'memory', final: true });
  return s;
}

export function initStory(stage, { reduced }) {
  const story = document.querySelector('.story');
  const track = story.querySelector('.track');
  const exact = reduced || new URLSearchParams(location.search).has('shot');
  const S = stage?.S ?? { k: 0, tokens: 0, prefill: 0, util: 0, hbm: 0, flow: 0, packet: 1, memFill: 0, memWeights: 0 };
  const graphs = initGraphs({ reduced });

  // --- the schedule: camera marks, panel windows ---
  const segs = schedule();
  const keys = [], marks = [], panels = [];
  let u = 0;
  segs.forEach((g, i) => {
    if (g.kind === 'hold') {
      const a = keys.push(g.single ? g.key : `${g.key}A`) - 1;
      const b = g.single ? a : keys.push(`${g.key}B`) - 1;
      marks.push({ u, k: a, move: false }, { u: u + g.len, k: b, move: false, flow: !!segs[i + 1]?.flow });
      g.h0 = u; g.h1 = u + g.len;
    }
    u += g.len;
  });
  const total = u;
  if (new URLSearchParams(location.search).has('debug')) window.__story = { segs, total }; // for test pages: where each beat sits, in svh
  // Moves sit between a hold's end mark and the next hold's start mark; ease those, keep holds linear.
  for (let i = 0; i < marks.length - 1; i++) marks[i].move = !marks[i].flow && marks[i + 1].u > marks[i].u && marks[i].k !== marks[i + 1].k && keys[marks[i].k].replace(/[AB]$/, '') !== keys[marks[i + 1].k].replace(/[AB]$/, '');
  track.style.setProperty('--track', `${total + 100}svh`);
  stage?.setKeys(keys);

  function keyAt(x) {
    let i = 0;
    while (i < marks.length - 2 && marks[i + 1].u <= x) i++;
    const a = marks[i], b = marks[i + 1];
    const f = b.u > a.u ? clamp((x - a.u) / (b.u - a.u)) : 1;
    return a.k + (b.k - a.k) * (a.move ? inOutSine(f) : f);
  }

  // --- panels: words rise out of clip masks on the way in and leave upwards on the way out ---
  let marquee = null;
  for (const g of segs) {
    if (!g.panel) continue;
    const el = story.querySelector(g.panel);
    if (!el) continue;
    // "Now it can talk": one large line read right to left as it scrolls past; no in/out choreography.
    if (g.marquee) {
      const line = el.querySelector('.marquee');
      marquee = { el, line, g, words: reduced ? [] : splitText(line, { words: { class: 'word' } }).words, offs: [], width: 0 };
      panels.push({ el, tl: createTimeline({ autoplay: false }), g, t: -1, live: false, in0: g.h0 - 8, in1: g.h0 - 7, out0: g.h1 + 6, out1: g.h1 + 7 });
      continue;
    }
    const side = el.dataset.side;
    const tl = createTimeline({ autoplay: false, defaults: { ease: 'outExpo' } });
    const title = el.querySelector('.ptitle'), text = el.querySelector('.ptext');
    const tw = title ? splitText(title, { words: { wrap: 'clip' } }).words : [];
    const pw = text ? splitText(text, { words: { wrap: 'clip' } }).words : [];
    const name = el.querySelector('.tokname');
    const rest = [...el.children].filter((c) => c !== title && c !== text && c !== name && !c.classList.contains('sr-only'));
    const dx = side === 'left' ? -28 : side === 'right' ? 28 : 0;
    if (reduced) {
      tl.add(el, { opacity: [0, 1], duration: 1000, ease: 'linear' }, 0);
      if (!g.final) tl.add(el, { opacity: [1, 0], duration: 1000, ease: 'linear' }, 1000);
    } else {
      if (tw.length) { utils.set(tw, { y: '110%' }); tl.add(tw, { y: ['110%', '0%'], duration: 760, delay: stagger(55) }, 0); }
      if (pw.length) { utils.set(pw, { y: '110%' }); tl.add(pw, { y: ['110%', '0%'], duration: 640, delay: stagger(9) }, 160); }
      if (rest.length) { utils.set(rest, { opacity: 0, x: dx }); tl.add(rest, { opacity: [0, 1], x: [dx, 0], duration: 700, delay: stagger(70) }, g.final || name ? 560 : 260); }
      if (!g.final) {
        if (tw.length) tl.add(tw, { y: ['0%', '-110%'], duration: 520, delay: stagger(30), ease: 'inQuad' }, 1050);
        if (pw.length) tl.add(pw, { y: ['0%', '-110%'], duration: 460, delay: stagger(4), ease: 'inQuad' }, 1080);
        if (rest.length) tl.add(rest, { opacity: [1, 0], x: [0, -dx * 0.5], duration: 420, ease: 'inQuad' }, 1100);
        if (name) tl.add(name, { opacity: [1, 0], y: ['0%', '-24%'], duration: 460, ease: 'inQuad' }, 1050);
      }
      tl.add({}, { duration: 1 }, 2000); // pin the timeline's length so seeks map 1:1
    }
    // The panel arrives as the subject settles and leaves before the camera moves on.
    const outAt = g.panelOut ? g.h0 + g.panelOut * (g.h1 - g.h0) : g.h1;
    panels.push({ el, tl, g, t: -1, live: false, in0: g.h0 - 22, in1: g.h0 + (g.final || g.hello ? 70 : 20), out0: outAt - 22, out1: outAt + 10 });
  }
  const seek = (pn, t) => { if (t !== pn.t) { pn.t = t; pn.tl.seek(t); } };
  // Where each card's top sits, so a phone on its side can frame the subject in the space above it.
  const bands = () => stage?.setBands(Object.fromEntries(panels.map((pn) => [pn.g.key, pn.el.offsetTop])));
  bands();
  // Keyboard users: tabbing into a panel that is off stage brings the story to it.
  panels.forEach((pn) => pn.el.addEventListener('focusin', () => {
    if (pn.live) return;
    const top = story.getBoundingClientRect().top + scrollY;
    scrollTo({ top: top + ((pn.g.h0 + pn.g.h1) / 2 / 100) * innerHeight, behavior: 'instant' });
  }));

  // --- the name: each token's block sweeps in, its ID counts up ---
  const hello = story.querySelector('#hello');
  const ntoks = [...hello.querySelectorAll('.ntok')];
  const nids = ntoks.map((t) => { const el = t.querySelector('.nid'); return { el, id: Number(el.textContent) }; });
  const helloTl = createTimeline({ autoplay: false, defaults: { ease: 'outExpo' } });
  if (!reduced) {
    const bgs = ntoks.map((t) => t.querySelector('.nbg')), nts = ntoks.map((t) => t.querySelector('.nt'));
    utils.set(bgs, { scaleX: 0 }); utils.set(nts, { opacity: 0, y: '30%' });
    helloTl.add(nts, { opacity: [0, 1], y: ['30%', '0%'], duration: 600, delay: stagger(130) }, 0)
      .add(bgs, { scaleX: [0, 1], duration: 520, delay: stagger(130) }, 120);
  }
  helloTl.add({}, { duration: 1 }, 1000);
  function name(q) {
    helloTl.seek(clamp(q / 0.55) * 1000);
    // Each ID arrives with its own token: no row of zeros waiting for the name.
    nids.forEach((n, i) => {
      const v = reduced ? 1 : clamp((q - 0.08 - i * 0.07) / 0.3);
      n.el.textContent = String(Math.round(n.id * v));
      n.el.style.opacity = String(clamp(v * 3));
    });
  }

  // --- everything, as a function of where the reader is ---
  const scalebar = story.querySelector('.scalebar');
  const zoomFrom = segs.find((g) => g.key === 'hello').h1 - 10, zoomEnd = segs.find((g) => g.key === 'boot').h0 - 30;
  let callBeat = null, lastGraphQ = {};
  function apply(p) {
    const x = p * total;
    S.k = keyAt(x);
    let call = null, live = null;
    for (const pn of panels) {
      let t;
      if (x <= pn.in0) t = 0;
      else if (x < pn.in1) t = ((x - pn.in0) / (pn.in1 - pn.in0)) * 1000;
      else if (pn.g.final || x <= pn.out0) t = 1000;
      else if (x < pn.out1) t = 1000 + ((x - pn.out0) / (pn.out1 - pn.out0)) * 1000;
      else t = 2000;
      const on = t > 0 && t < 2000;
      if (on !== pn.live) { pn.live = on; pn.el.classList.toggle('live', on); }
      if (on || pn.t !== t) seek(pn, t);
      const q = clamp((x - pn.g.h0) / (pn.g.h1 - pn.g.h0));
      if (on) live = pn;
      if (pn.g.callouts && x >= pn.in1 && x <= pn.out0) call = pn;
      if (pn.g.graph && lastGraphQ[pn.g.graph] !== q) { lastGraphQ[pn.g.graph] = q; graphs.setProgress(pn.g.graph, q); }
      if (pn.g.hello) name(clamp((x - pn.in0) / (pn.g.h1 - pn.in0)));
      if (pn.g.marquee && marquee.words.length && (on || pn.t !== -2)) {
        pn.t = on ? 0 : -2;
        const m = marquee, W = innerWidth;
        const qq = clamp((x - (pn.g.h0 - 8)) / (pn.g.h1 - pn.g.h0 + 16));
        const tx = W * 0.92 - qq * (W + m.width);
        m.line.style.transform = `translate3d(${tx.toFixed(1)}px, 0, 0)`;
        const readX = W * 0.42 - tx;
        m.words.forEach((w, i) => { const r = m.offs[i] < readX; if (r !== w._read) { w._read = r; w.classList.toggle('read', r); } });
      }
    }
    // What the GPU shows: the memory chart's state while it is up, idle otherwise.
    const gp = live?.g.graph ? graphs.stageState(live.g.graph, clamp((x - live.g.h0) / (live.g.h1 - live.g.h0))) : null;
    S.util = gp?.util ?? 0; S.hbm = gp?.hbm ?? 0; S.flow = gp?.flow ?? 0;
    S.packet = gp?.packet ?? 1; S.memFill = gp?.memFill ?? 0; S.memWeights = gp?.memWeights ?? 0;
    // A chart counts its prefills; each change flashes every SM once.
    if (gp?.prefill != null && gp.prefill !== lastPrefill) { if (lastPrefill != null) S.prefill++; lastPrefill = gp.prefill; }
    const beat = call?.g.callouts ?? null;
    // Labels keep clear of the panel only while it is up.
    if (beat !== callBeat) { callBeat = beat; stage?.setPanelRect(call?.live ? call.el.getBoundingClientRect() : null); stage?.setCallouts(beat); }
    // The scale bar belongs to the zoom: on from the transistor out to the board, off for the rest.
    // On phones the labels need the top of the screen, so the bar steps aside while they are up.
    const sb = x > zoomFrom && x < zoomEnd && !(callBeat && phoneQ.matches);
    if (scalebar && sb !== scalebar.classList.contains('on')) scalebar.classList.toggle('on', sb);
    palette(x);
  }
  // Beta: a beat with words holds its dealt palette, coming in over the camera's arrival and going out as it
  // leaves; everywhere else the stage is the plain block. The words take the palette's colours (data-pal).
  let lastDuo = '';
  function palette(x) {
    let pal = 'base', e = 0;
    if (look.on) for (const pn of panels) {
      const name = look.story[pn.g.key], { h0, h1, final } = pn.g;
      if (!name || x <= h0 - 30 || (!final && x >= h1 + 30)) continue;
      pal = name;
      e = x < h0 ? (x - h0 + 30) / 30 : final || x <= h1 ? 1 : 1 - (x - h1) / 30;
      e = e * e * (3 - 2 * e);
    }
    const c = look.colours(pal), key = `${c}|${e.toFixed(3)}`;
    if (key === lastDuo) return;
    lastDuo = key;
    // The shader wants the dark colour first: the ground in the dark theme, the ink in the light one.
    if (c) stage?.setDuo(...(document.documentElement.dataset.theme === 'light' ? [c[1], c[0]] : c), e); else stage?.setDuo(null, null, 0);
    if (look.on) story.dataset.pal = pal; else delete story.dataset.pal;
  }
  let lastPrefill = null;

  // Where each word of the marquee sits along its line, measured with the line at rest.
  function measureMarquee() {
    if (!marquee?.words.length) return;
    const prev = marquee.line.style.transform;
    marquee.line.style.transform = 'none';
    const x0 = marquee.line.getBoundingClientRect().left;
    marquee.offs = marquee.words.map((w) => { const r = w.getBoundingClientRect(); return r.left - x0 + r.width / 2; });
    marquee.width = marquee.line.scrollWidth;
    marquee.line.style.transform = prev;
  }
  measureMarquee();

  const state = { p: 0 };
  const tl = createTimeline({ autoplay: false, onUpdate: () => apply(state.p) });
  tl.add(state, { p: [0, 1], duration: 10000, ease: 'linear' }, 0);
  const observer = onScroll({ target: story, enter: 'top top', leave: 'bottom bottom', sync: exact ? true : 0.4 }).link(tl);
  apply(0);

  return {
    // Beta or the theme changed: the stage and the words take the palette for where the reader is now.
    repaint() { lastDuo = ''; apply(state.p); },
    rebuild() {
      if (observer.target) observer.refresh(); // the observer only takes its target on the next frame
      measureMarquee();
      graphs.rebuild();
      bands();
      if (callBeat) { const pn = panels.find((x) => x.g.callouts === callBeat); stage?.setPanelRect(pn?.el.getBoundingClientRect() ?? null); }
    },
  };
}
