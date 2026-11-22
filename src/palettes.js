// The page's colours: Kevin's own two-colour templates (templates/, kept out of the repo), a ground and an
// ink each, sampled from the images. The page reads as blocks, the way a long website does: a block in one
// palette, then a plain block, then another palette. The palettes are dealt anew on every visit, never one twice.
// Each palette is a pair of colours with two sides: in the dark theme its dark colour is the ground and its
// light one the ink; in the light theme the other way round. Where Kevin made both sides as templates
// (rust and amber, forest and sage, aubergine and pink) each theme takes its own template; the rest swap.
// The plain block ('base') is the theme itself, dark or paper, with its token colours.
// Teal and indigo are not from the templates: two more pairs in their manner (a deep ground, a pale ink of
// the same hue), so the seven blocks never repeat one.

export const PALETTES = {
  wine: { dark: ['#6e0a30', '#ffa0c9'], light: ['#ffa0c9', '#6e0a30'] },
  rust: { dark: ['#8a2b12', '#ffc856'], light: ['#ebb53d', '#842300'] },
  azure: { dark: ['#0b1d4f', '#a9d4ff'], light: ['#a9d4ff', '#0b1d4f'] }, // Kevin's navy, with a light azure for its cyan
  forest: { dark: ['#173324', '#bfe099'], light: ['#afcd87', '#041b06'] },
  aubergine: { dark: ['#200937', '#f090d1'], light: ['#fbc4d9', '#2e0056'] },
  ice: { dark: ['#044169', '#dde9f5'], light: ['#dde9f5', '#044169'] },
  teal: { dark: ['#003d3a', '#8eecd0'], light: ['#8eecd0', '#003d3a'] },
  indigo: { dark: ['#221c72', '#c8c0ff'], light: ['#c8c0ff', '#221c72'] },
};
// Which story beats get a palette (the rest of the story is the plain block: the hero, the chip building
// itself, the robot assembling), and which blocks below it. Seven blocks, eight palettes: none shows twice.
const BEATS = ['hello', 'logic', 'boot', 'body', 'memory'];
const BLOCKS = [['#certifications', null], ['#projects', 'p'], ['#writing', null], ['#work', 'p'], ['#contact', null], ['.foot', null]];

const root = document.documentElement;
// The deal, made once per visit: story beats first, then the palette blocks below, in page order.
const deck = Object.keys(PALETTES);
for (let i = deck.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [deck[i], deck[j]] = [deck[j], deck[i]]; }
export const palettes = {
  story: Object.fromEntries(BEATS.map((b, i) => [b, deck[i]])),
  // A palette's [ground, ink] in the theme now showing.
  colours: (name) => PALETTES[name]?.[root.dataset.theme === 'light' ? 'light' : 'dark'],
};

// Deals the blocks below the story, and lays the templates' paper grain over every block (sections.css):
// a tile of noise around mid grey, overlaid. The 3D stage makes the same grain on its ground.
export function initPalettes() {
  let k = BEATS.length;
  for (const [sel, pal] of BLOCKS) { const el = document.querySelector(sel); if (el) el.dataset.pal = pal ? deck[k++] : 'base'; }
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
