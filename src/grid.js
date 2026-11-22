// The drafting grid behind everything: dim at rest, lit where the pointer (or a finger) has just brushed it,
// then fading back. One map of cells over the screen, from its top-left corner, shared by the page's canvas
// (drawn here, behind all content) and the 3D stage (scene.js draws the same lines on its empty ground).
export const CELL = 80, MAJOR = 4; // squares of 80 CSS px, a stronger line every 4
export const DIM = 0.27; // the grid at rest, as a share of its brushed strength

// The shared state: cell values 0..1 and a version that moves whenever they change.
export const brush = { cols: 1, rows: 1, v: new Float32Array(1), version: 0 };

export function initGrid() {
  const canvas = document.createElement('canvas');
  canvas.className = 'gridfx';
  canvas.setAttribute('aria-hidden', 'true');
  document.body.prepend(canvas);
  const g = canvas.getContext('2d');
  let W = 0, H = 0, dpr = 1, ink = '0 0 0', a = [0, 0], last = null, raf = 0, prev = 0;

  function resize() {
    W = innerWidth; H = innerHeight; dpr = Math.min(2, devicePixelRatio || 1);
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    brush.cols = Math.ceil(W / CELL) + 1; brush.rows = Math.ceil(H / CELL) + 1;
    brush.v = new Float32Array(brush.cols * brush.rows);
    brush.version++;
    draw();
  }
  function colours() {
    const cs = getComputedStyle(document.documentElement);
    ink = cs.getPropertyValue('--grid-ink').trim();
    a = [parseFloat(cs.getPropertyValue('--grid-a')), parseFloat(cs.getPropertyValue('--grid-a-major'))];
    draw();
  }
  const at = (c, r) => (c < 0 || r < 0 || c >= brush.cols || r >= brush.rows ? 0 : brush.v[r * brush.cols + c]);
  // Each cell edge is as lit as the brighter of the two cells it bounds.
  function draw() {
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, W, H);
    for (let c = 0; c < brush.cols; c++) for (let r = 0; r < brush.rows; r++) {
      const x = c * CELL, y = r * CELL;
      // the left edge of cell (c, r), then its top edge
      const vl = Math.max(at(c, r), at(c - 1, r)), vt = Math.max(at(c, r), at(c, r - 1));
      const al = a[c % MAJOR ? 0 : 1] * (DIM + (1 - DIM) * vl), at_ = a[r % MAJOR ? 0 : 1] * (DIM + (1 - DIM) * vt);
      g.fillStyle = `rgb(${ink} / ${al.toFixed(4)})`; g.fillRect(x, y, 1, CELL);
      g.fillStyle = `rgb(${ink} / ${at_.toFixed(4)})`; g.fillRect(x, y, CELL, 1);
    }
  }
  function stroke(x, y) {
    const R = CELL * 1.5, x0 = last?.[0] ?? x, y0 = last?.[1] ?? y;
    const steps = Math.max(1, Math.ceil(Math.hypot(x - x0, y - y0) / (CELL * 0.4))); // a fast stroke leaves no gaps
    for (let k = 1; k <= steps; k++) {
      const px = x0 + ((x - x0) * k) / steps, py = y0 + ((y - y0) * k) / steps;
      for (let r = Math.max(0, Math.floor((py - R) / CELL)); r <= Math.min(brush.rows - 1, Math.floor((py + R) / CELL)); r++)
        for (let c = Math.max(0, Math.floor((px - R) / CELL)); c <= Math.min(brush.cols - 1, Math.floor((px + R) / CELL)); c++) {
          const d = Math.hypot((c + 0.5) * CELL - px, (r + 0.5) * CELL - py);
          if (d < R) { const t = 1 - d / R, i = r * brush.cols + c; brush.v[i] = Math.max(brush.v[i], t * t * (3 - 2 * t)); }
        }
    }
    last = [x, y];
    if (!raf) { prev = performance.now(); raf = requestAnimationFrame(frame); }
  }
  // Shown the instant it is brushed, then fading; the loop stops once everything is back at rest.
  function frame(now) {
    const fall = Math.exp(-(now - prev) / 650);
    prev = now;
    let live = false;
    for (let i = 0; i < brush.v.length; i++) {
      if (!brush.v[i]) continue;
      brush.v[i] *= fall;
      if (brush.v[i] < 0.004) brush.v[i] = 0; else live = true;
    }
    brush.version++;
    draw();
    raf = live ? requestAnimationFrame(frame) : 0;
  }

  addEventListener('pointermove', (e) => stroke(e.clientX, e.clientY), { passive: true });
  // A finger brushes too, even while it scrolls the page (the browser cancels its pointer events then).
  addEventListener('touchmove', (e) => { const t = e.touches[0]; if (t) stroke(t.clientX, t.clientY); }, { passive: true });
  for (const ev of ['pointerleave', 'touchend', 'blur']) addEventListener(ev, () => { last = null; }, { passive: true });
  document.documentElement.addEventListener('pointerleave', () => { last = null; });
  addEventListener('resize', resize);
  new MutationObserver(colours).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  resize();
  colours();
}
