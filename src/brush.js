// The brush behind the 3D story: the pointer (or a finger) paints strokes of ASCII on the stage's empty
// ground, which fade back down to a faint field of dots. This keeps the stroke map, one cell per character
// from the screen's top-left corner; scene.js draws a glyph per cell from it in its edge pass.
export const CW = 10, CH = 18; // a character cell, in CSS px

// Each cell's ink (0..1) and the direction of the stroke that last inked it (0..3: - \ | /, screen axes);
// the version moves whenever they change.
export const brush = { cols: 1, rows: 1, v: new Float32Array(1), dir: new Uint8Array(1), version: 0 };

const FADE = 900; // ms for a stroke to fall to a third of its ink
// A fixed grain per cell, so a stroke's edges fray the way a dry brush's bristles do.
const grain = (i) => (Math.imul(i + 1, 2654435761) >>> 0) / 4294967296;
const smooth = (t) => t * t * (3 - 2 * t);

export function initBrush() {
  let last = null, raf = 0, prev = 0;

  function resize() {
    brush.cols = Math.ceil(innerWidth / CW) + 1; brush.rows = Math.ceil(innerHeight / CH) + 1;
    brush.v = new Float32Array(brush.cols * brush.rows); brush.dir = new Uint8Array(brush.v.length);
    brush.version++;
  }
  // A stroke from the last point to this one, laid down every few pixels so a fast one leaves no gaps. Like a
  // brush, a slow stroke is broad and full and a fast one thin and lighter. Every cell it inks takes its
  // direction, which picks the hatching it is drawn with.
  function stroke(x, y, t) {
    if (!last) { last = [x, y, t]; return; }
    const [x0, y0, t0] = last, dx = x - x0, dy = y - y0, len = Math.hypot(dx, dy);
    if (len < 1) return;
    const fast = Math.min(1, len / Math.max(8, t - t0) / 2.5), R = 30 - 16 * fast, load = 1 - 0.3 * fast;
    const d = Math.round((((Math.atan2(dy, dx) % Math.PI) + Math.PI) % Math.PI) / (Math.PI / 4)) % 4;
    const steps = Math.ceil(len / (R * 0.3));
    for (let k = 1; k <= steps; k++) {
      const px = x0 + (dx * k) / steps, py = y0 + (dy * k) / steps;
      for (let r = Math.max(0, Math.floor((py - R) / CH)); r <= Math.min(brush.rows - 1, Math.floor((py + R) / CH)); r++)
        for (let c = Math.max(0, Math.floor((px - R) / CW)); c <= Math.min(brush.cols - 1, Math.floor((px + R) / CW)); c++) {
          const dist = Math.hypot((c + 0.5) * CW - px, (r + 0.5) * CH - py);
          if (dist >= R) continue;
          const i = r * brush.cols + c, ink = load * smooth(1 - dist / R) * (0.7 + 0.3 * grain(i));
          if (ink > brush.v[i]) { brush.v[i] = ink; brush.dir[i] = d; }
        }
    }
    last = [x, y, t];
    if (!raf) { prev = performance.now(); raf = requestAnimationFrame(frame); }
  }
  // The ink shows the instant it lands, then fades; the loop stops once everything is back at rest.
  function frame(now) {
    const fall = Math.exp(-(now - prev) / FADE);
    prev = now;
    let live = false;
    for (let i = 0; i < brush.v.length; i++) {
      if (!brush.v[i]) continue;
      brush.v[i] *= fall;
      if (brush.v[i] < 0.004) brush.v[i] = 0; else live = true;
    }
    brush.version++;
    raf = live ? requestAnimationFrame(frame) : 0;
  }

  addEventListener('pointermove', (e) => stroke(e.clientX, e.clientY, e.timeStamp), { passive: true });
  // A finger paints too, even while it scrolls the page (the browser cancels its pointer events then).
  addEventListener('touchmove', (e) => { const p = e.touches[0]; if (p) stroke(p.clientX, p.clientY, e.timeStamp); }, { passive: true });
  for (const ev of ['pointerleave', 'touchend', 'blur']) addEventListener(ev, () => { last = null; }, { passive: true });
  document.documentElement.addEventListener('pointerleave', () => { last = null; });
  addEventListener('resize', resize);
  resize();
}
