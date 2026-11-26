// The page's colours: Kevin's own two-colour templates (templates/, kept out of the repo), a ground and an
// ink each, sampled from the images. Every part of the page is a block in one of them, chosen for what it
// says: yellow for the hello (and the way back to it, at the end), blue for listening (trust), red for building
// (passion), pink for keeping it loved, green for running it lean (patience, a garden). The sections replay
// the story's colours backwards, so the page ends in the colour it starts in.
// Each palette is a pair of colours with two sides: in the dark theme its dark colour is the ground and its
// light one the ink; in the light theme the other way round. Where Kevin made both sides as templates
// (rust and amber, forest and sage, aubergine and pink) each theme takes its own template; the rest swap.
// The section blocks carry their palette in their markup (data-pal, sections/render.js).

export const PALETTES = {
  rust: { dark: ['#8a2b12', '#ffc856'], light: ['#ebb53d', '#842300'] }, // yellow
  azure: { dark: ['#0b1d4f', '#a9d4ff'], light: ['#a9d4ff', '#0b1d4f'] }, // blue: Kevin's navy, with a light azure for its cyan
  wine: { dark: ['#6e0a30', '#ffa0c9'], light: ['#ffa0c9', '#6e0a30'] }, // red
  aubergine: { dark: ['#200937', '#f090d1'], light: ['#fbc4d9', '#2e0056'] }, // pink
  forest: { dark: ['#173324', '#bfe099'], light: ['#afcd87', '#041b06'] }, // green
};

const root = document.documentElement;
export const palettes = {
  // Each story beat's palette, by its hold's key; the opening takes the first one's.
  story: { hello: 'rust', logic: 'azure', board: 'wine', boot: 'wine', body: 'aubergine', memory: 'forest' },
  // A palette's [ground, ink] in the theme now showing.
  colours: (name) => PALETTES[name]?.[root.dataset.theme === 'light' ? 'light' : 'dark'],
};

// Lays the templates' paper grain over every block (sections.css): a tile of noise around mid grey,
// overlaid. The 3D stage makes the same grain on its ground.
export function initPalettes() {
  const c = document.createElement('canvas'), S = 256;
  c.width = c.height = S;
  const g = c.getContext('2d'), d = g.createImageData(S, S);
  for (let i = 0; i < d.data.length; i += 4) {
    const v = 128 + ((Math.random() + Math.random() + Math.random()) / 3 - 0.5) * 2 * 40;
    d.data[i] = d.data[i + 1] = d.data[i + 2] = v; d.data[i + 3] = 255;
  }
  g.putImageData(d, 0, 0);
  root.style.setProperty('--grain', `url(${c.toDataURL()})`);
}

// The page's own edges take the colours of the block in the middle of the screen: the scrollbar (the ink on the
// ground), the browser's bar on phones (theme-color), and the root behind an overscroll. Returns its repaint,
// for a theme change.
export function followBlocks() {
  const blocks = [...document.querySelectorAll('.story, .sec, .foot')], meta = document.querySelector('meta[name="theme-color"]');
  let last = '';
  const paint = () => {
    const mid = innerHeight / 2;
    const el = blocks.find((b) => { const r = b.getBoundingClientRect(); return r.top <= mid && r.bottom > mid; }) ?? blocks[0];
    const [ground, ink] = palettes.colours(el.dataset.pal) ?? [], key = ground + ink;
    if (!ground || key === last) return;
    last = key;
    root.style.setProperty('scrollbar-color', `color-mix(in oklab, ${ink} 60%, ${ground}) ${ground}`);
    root.style.backgroundColor = ground;
    meta?.setAttribute('content', ground);
  };
  addEventListener('scroll', paint, { passive: true });
  addEventListener('resize', paint);
  // The story changes palette between beats as it eases to the scroll, after the scroll events have stopped.
  new MutationObserver(paint).observe(blocks[0], { attributes: true, attributeFilter: ['data-pal'] });
  paint();
  return () => { last = ''; paint(); };
}
