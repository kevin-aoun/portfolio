// Work bench for the charts: every panel live in its own full-screen frame, a slider to scrub q, the
// state the 3D GPU would get (also logged), and a theme switch. ?theme=light, ?q=0.5, ?shot hides the
// controls; window.bench.set(id, q) drives it from scripts.
import '@fontsource-variable/albert-sans';
import '@fontsource-variable/jetbrains-mono';
import '../src/styles/base.css';
import '../src/styles/story.css';
import '../src/styles/graphs.css';
import { graphPanels } from '../src/graphs/markup.js';
import { initGraphs } from '../src/graphs/motion.js';

const qs = new URLSearchParams(location.search);
const root = document.documentElement;
root.dataset.theme = qs.get('theme') === 'light' ? 'light' : 'dark';
root.classList.toggle('shot', qs.has('shot'));

const tmp = document.createElement('div');
tmp.innerHTML = graphPanels();
const frames = new Map([...tmp.children].map((panel) => {
  const id = panel.querySelector('[data-chart]').dataset.chart;
  const f = document.createElement('section');
  f.className = 'bench';
  f.id = `bench-${id}`;
  f.dataset.side = panel.dataset.side;
  f.innerHTML = '<div class="panels"></div><div class="ctl"><label>q <output></output><input type="range" min="0" max="1" step="0.001"></label><pre></pre></div>';
  panel.classList.add('live');
  f.firstElementChild.append(panel);
  document.body.append(f);
  return [id, f];
}));
const btn = Object.assign(document.createElement('button'), { className: 'btn themebtn', textContent: 'Theme' });
btn.addEventListener('click', () => { root.dataset.theme = root.dataset.theme === 'dark' ? 'light' : 'dark'; });
document.body.append(btn);

const graphs = initGraphs({ reduced: matchMedia('(prefers-reduced-motion: reduce)').matches });
function set(id, q) {
  const f = frames.get(id), s = graphs.stageState(id, q);
  graphs.setProgress(id, q);
  f.querySelector('input').value = q;
  f.querySelector('output').value = q.toFixed(3);
  f.querySelector('pre').textContent = JSON.stringify(s, (k, v) => (typeof v === 'number' ? Math.round(v * 1000) / 1000 : v), 1);
  console.log('stageState', id, q, s);
  return s;
}
frames.forEach((f, id) => {
  f.querySelector('input').addEventListener('input', (e) => set(id, Number(e.target.value)));
  set(id, Number(qs.get('q') ?? 1));
});
window.bench = { set, theme: (t) => { root.dataset.theme = t; } };
