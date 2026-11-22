// Callout layout for one view. Each label goes to a lane outside the subject's on-screen box (a row
// above or below it, or a column beside it), never over the text panel or the bar; labels in a lane are
// sorted along it so their leaders do not cross, then pushed apart so no two touch. A label with no
// room anywhere is dropped rather than allowed to overlap.
//
// items:   [{ ax, ay, w, h, prio }]  anchor in px, label size in px
// subject: { x0, y0, x1, y1 }       projected bounding box of the subject, px
// safe:    { x0, y0, x1, y1 }       where labels may go (viewport minus margins, bar and panel)
// assign:  optional lanes from an earlier call, so a label keeps its lane while the camera drifts
// returns: { placed: [{ x, y, lane, path: [[x, y], ...] } | null], assign: [lane | null] }
export function layoutCallouts(items, subject, safe, { gap = 40, spacing = 22, assign = null } = {}) {
  const R = {
    x0: Math.max(subject.x0, safe.x0), y0: Math.max(subject.y0, safe.y0),
    x1: Math.min(subject.x1, safe.x1), y1: Math.min(subject.y1, safe.y1),
  };
  const lanes = {
    top: { kind: 'row', y: R.y0 - gap, room: R.y0 - gap - safe.y0 },
    bottom: { kind: 'row', y: R.y1 + gap, room: safe.y1 - (R.y1 + gap) },
    right: { kind: 'col', x: R.x1 + gap, room: safe.x1 - (R.x1 + gap) },
    left: { kind: 'col', x: R.x0 - gap, room: R.x0 - gap - safe.x0 },
  };
  const out = items.map(() => null);
  const members = { top: [], bottom: [], right: [], left: [] };
  const cx = (R.x0 + R.x1) / 2, cy = (R.y0 + R.y1) / 2;
  const fits = (lane, it) => (lanes[lane].kind === 'row' ? lanes[lane].room >= it.h : lanes[lane].room >= it.w);

  // Nearest edge first; ties go to rows, which keep leaders short and vertical.
  items.forEach((it, i) => {
    // Keep the lane from the last frame while it still fits; otherwise choose again rather than drop it.
    if (assign?.[i] && fits(assign[i], it)) { members[assign[i]].push(i); return; }
    // Leader length to each lane, in px; columns pay a small premium so rows win ties.
    const d = {
      top: it.ay - (lanes.top.y - it.h / 2),
      bottom: lanes.bottom.y + it.h / 2 - it.ay,
      left: it.ax - lanes.left.x + 40,
      right: lanes.right.x - it.ax + 40,
    };
    const order = Object.keys(d).sort((a, b) => d[a] - d[b]);
    const lane = order.find((l) => fits(l, it));
    if (lane) members[lane].push(i);
  });

  // Rows: labels centred over their anchors, swept apart left to right, then pulled back inside.
  for (const name of ['top', 'bottom']) {
    const L = lanes[name], ids = members[name].sort((a, b) => items[a].ax - items[b].ax);
    const xs = ids.map((i) => Math.min(Math.max(items[i].ax - items[i].w / 2, safe.x0), safe.x1 - items[i].w));
    for (let k = 1; k < ids.length; k++) xs[k] = Math.max(xs[k], xs[k - 1] + items[ids[k - 1]].w + spacing);
    for (let k = ids.length - 1; k >= 0; k--) {
      const lim = k === ids.length - 1 ? safe.x1 - items[ids[k]].w : xs[k + 1] - spacing - items[ids[k]].w;
      xs[k] = Math.min(xs[k], lim);
    }
    ids.forEach((i, k) => {
      const it = items[i];
      if (xs[k] < safe.x0 - 1) return; // no room left in this row
      const y = name === 'top' ? L.y - it.h : L.y;
      const lx = xs[k] + it.w / 2;
      const ey = name === 'top' ? L.y + 14 : L.y - 14;
      const end = name === 'top' ? L.y + 4 : L.y - 4;
      out[i] = { x: xs[k], y, lane: name, path: [[it.ax, it.ay], [lx, ey], [lx, end]] };
    });
  }
  // Columns: labels level with their anchors, swept apart top to bottom, then pulled back inside.
  for (const name of ['right', 'left']) {
    const L = lanes[name], ids = members[name].sort((a, b) => items[a].ay - items[b].ay);
    const ys = ids.map((i) => Math.min(Math.max(items[i].ay - items[i].h / 2, safe.y0), safe.y1 - items[i].h));
    for (let k = 1; k < ids.length; k++) ys[k] = Math.max(ys[k], ys[k - 1] + items[ids[k - 1]].h + spacing * 0.5);
    for (let k = ids.length - 1; k >= 0; k--) {
      const lim = k === ids.length - 1 ? safe.y1 - items[ids[k]].h : ys[k + 1] - spacing * 0.5 - items[ids[k]].h;
      ys[k] = Math.min(ys[k], lim);
    }
    ids.forEach((i, k) => {
      const it = items[i];
      if (ys[k] < safe.y0 - 1) return;
      const x = name === 'right' ? L.x : L.x - it.w;
      const ly = ys[k] + it.h / 2;
      const ex = name === 'right' ? L.x - 16 : L.x + 16;
      const end = name === 'right' ? L.x - 6 : L.x + 6;
      out[i] = { x, y: ys[k], lane: name, path: [[it.ax, it.ay], [ex, ly], [end, ly]] };
    });
  }
  // Drop any label that would still sit on its own anchor's subject edge or on another label.
  const boxes = out.map((o, i) => o && { x0: o.x, y0: o.y, x1: o.x + items[i].w, y1: o.y + items[i].h });
  for (let i = 0; i < out.length; i++) for (let j = 0; j < i; j++) {
    const a = boxes[i], b = boxes[j];
    if (a && b && a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1) {
      const drop = (items[i].prio ?? 0) >= (items[j].prio ?? 0) ? j : i;
      out[drop] = null; boxes[drop] = null;
    }
  }
  const lanesOut = out.map((o) => (o ? o.lane : null));
  return { placed: out, assign: lanesOut };
}

// Self-check: two labels aimed at the same spot must come out apart, and stay inside the safe area.
export function _selfTest() {
  const safe = { x0: 600, y0: 80, x1: 1380, y1: 830 };
  const subject = { x0: 700, y0: 260, x1: 1200, y1: 640 };
  const items = [{ ax: 900, ay: 300, w: 120, h: 20 }, { ax: 905, ay: 302, w: 140, h: 20 }, { ax: 1150, ay: 600, w: 200, h: 20 }];
  const r = layoutCallouts(items, subject, safe).placed;
  const ok = r.every((o, i) => o && o.x >= safe.x0 && o.x + items[i].w <= safe.x1 && o.y >= safe.y0 && o.y + items[i].h <= safe.y1)
    && (r[0].x + items[0].w <= r[1].x || r[1].x + items[1].w <= r[0].x || r[0].y + items[0].h <= r[1].y || r[1].y + items[1].h <= r[0].y);
  if (!ok) throw new Error('callout layout self-test failed: ' + JSON.stringify(r));
  return true;
}
