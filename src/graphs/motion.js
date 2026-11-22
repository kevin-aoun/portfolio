// The charts in the browser: each is redrawn at its real pixel size (so 1px lines stay 1px and labels stay
// readable on a phone), then setProgress(id, q) redraws only its moving parts. Everything is a pure
// function of q, so scrolling back plays it in reverse. stageState(id, q) is what the 3D GPU shows.
import { chart } from './markup.js';
import { stageState, clamp01 } from './data.js';

// A chart plays from q 0.14, once its card has faded in, to q 0.70, so the finished chart holds for about
// 30svh before the panel leaves (story.js: card in by h0+20, out from h1-22, 165svh hold). Reduced motion
// shows the final state.
const play = (q, reduced) => (reduced ? 1 : clamp01((q - 0.14) / 0.56));

export function initGraphs({ reduced = false } = {}) {
  const charts = new Map([...document.querySelectorAll('.chart[data-chart]')].map((fig) => [fig.dataset.chart, { svg: fig.querySelector('svg'), q: 1, c: null, live: null }]));

  function draw(id) {
    const o = charts.get(id), w = Math.round(o.svg.clientWidth), h = Math.round(o.svg.clientHeight);
    if (!w || !h) return; // not laid out: keep the static drawing
    o.c = chart(id, w, h);
    o.svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
    o.svg.innerHTML = `${o.c.frame}<g>${o.c.live(o.q)}</g>`;
    o.live = o.svg.lastElementChild;
  }
  function setProgress(id, q) {
    const o = charts.get(id);
    if (!o) return;
    o.q = play(q, reduced);
    if (o.c) o.live.innerHTML = o.c.live(o.q);
  }
  const rebuild = () => charts.forEach((_, id) => draw(id));

  // Panel widths follow the viewport; redraw a chart whenever its box changes size.
  const ro = new ResizeObserver((entries) => entries.forEach((e) => draw(e.target.closest('.chart').dataset.chart)));
  charts.forEach((o) => ro.observe(o.svg));
  rebuild();
  return { setProgress, stageState: (id, q) => stageState(id, play(q, reduced)), rebuild };
}
