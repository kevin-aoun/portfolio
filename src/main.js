import '@fontsource-variable/albert-sans';
import '@fontsource-variable/jetbrains-mono';
import './styles/base.css';
import './styles/story.css';
import './styles/graphs.css';
import './styles/sections.css';
import './styles/footer.css';
import { initTheme } from './theme.js';
import { initStory } from './story.js';
import { initContact } from './contact.js';
import { initSections } from './sections/motion.js';
import { initOrbs } from './sections/orb.js';
import { initField } from './footer/field.js';
import { bindTokenSwitches } from './tokens.js';
import { initBrush } from './brush.js';
import { initPalettes } from './palettes.js';

const root = document.documentElement;
root.classList.add('js');
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
let stage = null, story = null;

async function boot() {
  initBrush();
  initPalettes();
  bindTokenSwitches();
  // The palettes have a side for each theme, so a new theme repaints them too.
  initTheme((t) => { stage?.applyTheme(t); story?.repaint(); });
  // The 3D chunk starts loading now; only the story waits for it, the sections below it do not.
  const scene = import('./scene/scene.js');
  initContact();
  initSections({ reduced });
  initOrbs({ reduced });
  initField({ reduced });
  const canvas = document.querySelector('.gl');
  try {
    const { createStage } = await scene;
    stage = createStage(canvas, { reducedMotion: reduced, theme: root.dataset.theme });
    stage.mountOverlays(document.querySelector('.tags'), document.querySelector('.leaders'), document.querySelector('.scalebar'));
    // Draw only while the story is on screen.
    new IntersectionObserver(([e]) => (e.isIntersecting ? stage.start() : stage.stop())).observe(document.querySelector('.story'));
  } catch (err) {
    // No WebGL: the panels still tell the story over an empty stage, with no scale bar to measure it.
    console.warn('3D stage unavailable', err);
    canvas.remove();
    document.querySelector('.scalebar')?.remove();
    stage = null;
  }
  story = initStory(stage, { reduced });
  keepPlace();
  document.fonts?.ready.then(() => story.rebuild());
}

// A resize or a rotation keeps the reader on the same beat. The story's track is sized in svh and the scroll
// position is in px, so the place is noted as a fraction of the track and scrolled back to after the rebuild.
// A phone's address bar changes innerHeight but not svh, so only a change in the track's height counts.
function keepPlace() {
  const el = document.querySelector('.story'), track = el.querySelector('.track');
  let frac = null, h = 0, held = false, t = 0;
  const note = () => {
    if (held) return;
    h = track.offsetHeight;
    const y = scrollY - el.offsetTop;
    frac = y >= 0 && y < h ? y / h : null; // below the story, the browser keeps the place itself
  };
  addEventListener('scroll', note, { passive: true });
  note();
  addEventListener('resize', () => {
    if (frac !== null && track.offsetHeight !== h) held = true;
    clearTimeout(t);
    t = setTimeout(() => {
      stage?.resize();
      story.rebuild();
      if (!held) return;
      held = false;
      scrollTo({ top: el.offsetTop + frac * track.offsetHeight, behavior: 'instant' });
    }, 160);
  });
}

boot();
