// Entrances and small interactions for work, projects, writing, contact and the footer.
import { animate, stagger, utils } from 'animejs';

// Play once, the first time `el` scrolls into view.
function once(el, play) {
  const io = new IntersectionObserver((entries) => {
    if (!entries.some((e) => e.isIntersecting)) return;
    io.disconnect();
    play();
  }, { rootMargin: '0px 0px -10% 0px' });
  io.observe(el);
}

// [a group, its parts]: each group comes in when it is first seen, its parts a beat apart.
const GROUPS = [
  ['.sec h2', ''], ['.certs', '.cert'], ['.jobs', '.job'], ['.creds', 'h3, li'], ['.pj-list', '.pj-row'], ['.pj-stage', ''],
  ['.wr-group', 'h3, li'], ['.ct-lead', ''], ['.composer', ':scope > *'], ['.ct-links', 'li'], ['.foot', 'p'],
];

export function initSections({ reduced = false } = {}) {
  projectCards(reduced);
  carousel(reduced);
  trace();
  timeline(reduced);
  navCurrent();
  if (reduced) return;
  for (const [sel, partSel] of GROUPS) {
    document.querySelectorAll(sel).forEach((g) => {
      const parts = partSel ? [...g.querySelectorAll(partSel)] : [g];
      // Faint, never invisible, so nothing reads as missing before it has been scrolled to.
      utils.set(parts, { opacity: 0.25, translateY: 24 });
      once(g, () => animate(parts, { opacity: 1, translateY: 0, duration: 700, delay: stagger(70), ease: 'outQuart' }));
    });
  }
  // The trace fills in like a capture: each role runs out from its start, in time order, then its name.
  const box = document.querySelector('.trace');
  if (!box) return;
  const bars = [...box.querySelectorAll('.tbar')], labels = [...box.querySelectorAll('.tl')];
  const start = (el) => parseFloat(el.style.getPropertyValue('--x')) * 10;
  utils.set(bars, { opacity: 0.25, clipPath: 'inset(0 75% 0 0)' });
  utils.set(labels, { opacity: 0.25 });
  once(box, () => {
    animate(bars, { opacity: 1, clipPath: 'inset(0 0% 0 0)', duration: 900, delay: start, ease: 'outQuart' });
    animate(labels, { opacity: 1, duration: 500, delay: (el) => start(el) + 400, ease: 'outQuad' });
  });
}

// The bar marks the section being read (aria-current, styled in base.css), and none while the story is on
// screen. A section counts once it crosses a line 40% down the screen; below the last one, the footer, the
// last stays marked.
function navCurrent() {
  const links = [...document.querySelectorAll('.bar nav a[href^="#"]')];
  if (!links.length) return;
  const story = document.querySelector('.story');
  const targets = [story, ...links.map((a) => document.getElementById(a.hash.slice(1)))].filter(Boolean);
  const mark = (id) => links.forEach((a) => (a.hash === `#${id}` ? a.setAttribute('aria-current', 'true') : a.removeAttribute('aria-current')));
  const io = new IntersectionObserver((es) => es.forEach((e) => e.isIntersecting && mark(e.target === story ? '' : e.target.id)), { rootMargin: '-40% 0px -60% 0px' });
  targets.forEach((el) => io.observe(el));
}

// Phones and tablets: the projects carousel (sections.css). Its dots follow the card in view, and a tap on
// one slides there.
function carousel(reduced) {
  const track = document.querySelector('.pj-list'), dots = [...document.querySelectorAll('.pj-dots button')];
  if (!track || !dots.length) return;
  const cards = [...track.children];
  const show = (i) => dots.forEach((d, k) => (k === i ? d.setAttribute('aria-current', 'true') : d.removeAttribute('aria-current')));
  const io = new IntersectionObserver((es) => es.forEach((e) => e.isIntersecting && show(cards.indexOf(e.target))), { root: track, threshold: 0.6 });
  cards.forEach((c) => io.observe(c));
  dots.forEach((d, i) => d.addEventListener('click', () => track.scrollTo({ left: cards[i].offsetLeft - cards[0].offsetLeft, behavior: reduced ? 'instant' : 'smooth' })));
}

// Phones and tablets: the roles as a vertical timeline (sections.css). The rail fills down to the middle of the
// screen; the role there lights up and the ones above it keep their colour. A tap on a role brings it there.
function timeline(reduced) {
  const list = document.querySelector('.jobs');
  if (!list) return;
  const jobs = [...list.children], narrow = matchMedia('(max-width: 959px)');
  let raf = 0, seen = false;
  const update = () => {
    raf = 0;
    const mid = innerHeight / 2, r = list.getBoundingClientRect();
    list.style.setProperty('--p', Math.min(1, Math.max(0, (mid - r.top) / r.height)).toFixed(3));
    const cur = jobs.findLastIndex((j) => j.getBoundingClientRect().top <= mid);
    jobs.forEach((j, i) => { j.classList.toggle('hot', i === cur); j.classList.toggle('past', i < cur); });
  };
  const queue = () => { if (seen && narrow.matches && !raf) raf = requestAnimationFrame(update); };
  new IntersectionObserver(([e]) => { seen = e.isIntersecting; queue(); }).observe(list);
  addEventListener('scroll', queue, { passive: true });
  // Wider again, the trace is back and it lights roles on hover itself.
  narrow.addEventListener('change', () => { if (narrow.matches) return queue(); list.style.removeProperty('--p'); jobs.forEach((j) => j.classList.remove('hot', 'past')); });
  list.addEventListener('click', (e) => {
    const job = e.target.closest('.job');
    if (job && narrow.matches && !e.target.closest('a')) job.scrollIntoView({ block: 'center', behavior: reduced ? 'instant' : 'smooth' });
  });
}

// Projects: the row you point at or focus brings up its card; scrolling, the row level with the square's middle does.
function projectCards(reduced) {
  const rows = [...document.querySelectorAll('.pj-row')];
  const cards = [...document.querySelectorAll('.pj-card')];
  if (!cards.length) return;
  let cur = 0;
  const pick = (i) => {
    if (i === cur || i < 0) return;
    cur = i;
    rows.forEach((r, k) => r.classList.toggle('on', k === i));
    cards.forEach((c, k) => c.classList.toggle('on', k === i));
    if (!reduced) animate(cards[i].querySelectorAll('.art > *'), { opacity: [0.25, 1], duration: 420, delay: stagger(5), ease: 'outQuad' });
  };
  rows.forEach((r, i) => {
    r.addEventListener('pointerenter', () => pick(i));
    r.addEventListener('focusin', () => pick(i));
  });
  // Scrolling steers only while the reader is not pointing at or tabbing through the list.
  const list = rows[0].parentElement, stage = document.querySelector('.pj-stage');
  const level = () => {
    const s = stage.getBoundingClientRect();
    if (!s.height || s.bottom < 0 || s.top > innerHeight || list.matches(':hover, :focus-within')) return; // hidden (phones) or off screen
    const y = s.top + s.height / 2;
    const gap = (r) => { const b = r.getBoundingClientRect(); return Math.max(b.top - y, y - b.bottom, 0); };
    pick(rows.reduce((best, r, k) => (gap(r) < gap(rows[best]) ? k : best), 0));
  };
  addEventListener('scroll', level, { passive: true });
  addEventListener('resize', level);
}

// Work: a role's name sits on its bar when it fits, else beside the bar where the row is empty, else above it
// when the organisation's name has a line of its own (narrow screens); with no room anywhere it is left
// off, as a profiler does, and the list below still has it. Pointing at a role lights its bar, and back.
function trace() {
  const box = document.querySelector('.trace');
  if (!box) return;
  const labels = [...box.querySelectorAll('.tl')];
  const place = () => {
    labels.forEach((tl) => { tl.dataset.at = 'right'; }); // width: auto, so every name measures whole
    const need = new Map(labels.map((tl) => [tl, tl.offsetWidth])); // the name plus 8px either side
    box.querySelectorAll('.ttrack').forEach((track) => {
      const W = track.clientWidth, org = track.previousElementSibling, bars = [...track.querySelectorAll('.tbar')];
      const name = document.createRange();
      name.selectNodeContents(org);
      const above = org.getBoundingClientRect().bottom <= track.getBoundingClientRect().top + 1 ? name.getBoundingClientRect().width : Infinity;
      track.querySelectorAll('.tl').forEach((tl, i) => {
        const n = need.get(tl), x = bars[i].offsetLeft, r = x + bars[i].offsetWidth;
        const prev = i ? bars[i - 1].offsetLeft + bars[i - 1].offsetWidth : 0, next = bars[i + 1]?.offsetLeft ?? W;
        tl.dataset.at = n <= r - x ? '' : n <= next - r ? 'right' : n <= x - prev ? 'left' : r - n >= above ? 'above' : 'none';
      });
    });
  };
  new ResizeObserver(place).observe(box);
  document.fonts?.ready.then(place);
  const light = (i, on) => document.querySelectorAll(`[data-job="${i}"]`).forEach((el) => el.classList.toggle('hot', on));
  // A mouse only: a tap fires both, and on phones the timeline decides which role is lit.
  document.querySelectorAll('[data-job]').forEach((el) => {
    el.addEventListener('pointerenter', (e) => e.pointerType === 'mouse' && light(el.dataset.job, true));
    el.addEventListener('pointerleave', (e) => e.pointerType === 'mouse' && light(el.dataset.job, false));
  });
}
