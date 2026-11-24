// Renders the content into static HTML at build time (see vite.config.js), so the page reads fully
// without JavaScript; main.js adds the 3D stage and the motion on top.
import { person, beats, body, hello } from './content.js';
import tokens from './data/tokens.json' with { type: 'json' };
import { graphPanels } from './graphs/markup.js';
import { MARK_PATH } from './footer/mark.js';
export { certificationsSection, workSection, projectsSection, writingSection, contactSection, footer } from './sections/render.js';

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const ext = (href) => (href.startsWith('http') ? ' target="_blank" rel="noopener"' : '');

const sun = '<svg class="sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4.2"/><path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M5.3 18.7l1.6-1.6M17.1 6.9l1.6-1.6"/></svg>';
const moon = '<svg class="moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" aria-hidden="true"><path d="M20.2 14.6A8.4 8.4 0 0 1 9.4 3.8a8.4 8.4 0 1 0 10.8 10.8Z"/></svg>';

export const header = () => `
<p class="notice" role="note">Still under construction, please watch your head</p>
<header class="bar">
  <a class="wordmark" href="#top" aria-label="${person.name}, back to the top"><svg class="mark" viewBox="264.6 78.6 793 983.9" aria-hidden="true"><path d="${MARK_PATH}"/></svg><span class="full">${person.name}</span></a>
  <nav aria-label="Sections"><a href="#projects">Projects</a><a href="#writing">Writing</a><a href="#work">Work</a><a href="#contact">Contact</a></nav>
  <button class="theme" type="button" aria-label="Switch to light theme">${sun}${moon}</button>
</header>`;

// One panel per beat. The panels live in the sticky stage and are moved by the scroll timeline;
// without JavaScript they simply stack and read in order. The marquee is one line drawn for the eye;
// screen readers get its title as the heading and the rest as a paragraph.
const beatPanel = (b) => b.marquee ? `
<article class="panel marquee-panel" id="beat-${b.id}" data-beat="${b.id}" data-side="center">
  <h2 class="sr-only">${esc(b.title)}</h2>
  <p class="sr-only">${esc(b.text)}</p>
  <p class="marquee" aria-hidden="true"><span class="mq-lead">${esc(b.title)}</span> <span class="mq-rest">${esc(b.text)}</span></p>
</article>` : `
<article class="panel beat-panel" id="beat-${b.id}" data-beat="${b.id}" data-side="${b.side}">
  <h2 class="ptitle">${esc(b.title)}</h2>
  <p class="ptext">${esc(b.text)}</p>
</article>`;

// Right after the transistor: the name in its real tokens.
const helloPanel = () => `
<article class="panel hello-panel" id="hello" data-beat="hello" data-side="center" aria-labelledby="hello-title">
  <h2 id="hello-title" class="tokname" aria-label="Hey, I'm Kevin">${tokens.name
    .map((x, i) => `<span class="ntok${x.t.startsWith(' ') ? ' lead' : ''}" aria-hidden="true"><span class="nbg tk tk${i % 5}"></span><span class="nt">${esc(x.t)}</span><span class="nid" data-ui>${x.id}</span></span>`)
    .join('')}</h2>
  <p class="hello-lead">${esc(hello.lead)}</p>
  <p class="hello-actions"><a class="btn btn-cta" href="${person.call}"${ext(person.call)}>Book a call</a></p>
</article>`;

export const story = () => `
<h1 class="sr-only">${person.name}, ${person.role}. From one transistor to a robot.</h1>
<section class="story" id="top" aria-label="From one transistor to a robot">
  <div class="stage">
    <canvas class="gl" aria-hidden="true"></canvas>
    <svg class="leaders" aria-hidden="true"></svg>
    <div class="tags" aria-hidden="true"></div>
    <div class="scalebar" aria-hidden="true"><i></i><span class="sb-len">100 nm</span><span class="sb-fov">Field of view 120 nm</span></div>
    <p class="scroll-hint" aria-hidden="true"><span>Scroll</span></p>
    <div class="panels">
      ${helloPanel()}
      ${beats.map(beatPanel).join('')}
      ${beatPanel(body)}
      ${graphPanels()}
    </div>
  </div>
  <div class="track" aria-hidden="true"></div>
</section>`;
