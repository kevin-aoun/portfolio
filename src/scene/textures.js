// Procedural surfaces, drawn on canvases in the active look's colours: the GH100-style die floorplan,
// the interposer's through-silicon vias and the board's traces.
import * as THREE from 'three';

export const DIE_MM = 28.5; // GH100 is 814 mm², about 28.5 mm on a side

// Floorplan in normalised die coordinates (0..1): eight GPCs of 18 SMs around a central L2 band,
// HBM interfaces on the left and right edges, NVLink and PCIe along the top and bottom.
export function floorplan() {
  const edge = 0.06, band0 = 0.465, band1 = 0.535, top0 = 0.05, bot1 = 0.95;
  const gpcs = [], sms = [];
  const cols = 4, gapX = 0.012, gapY = 0.012;
  const gw = (1 - 2 * edge - gapX * (cols - 1)) / cols;
  for (let r = 0; r < 2; r++) {
    const y0 = r === 0 ? top0 : band1 + gapY, y1 = r === 0 ? band0 - gapY : bot1;
    for (let c = 0; c < cols; c++) {
      const x0 = edge + c * (gw + gapX);
      const g = { x0, y0, x1: x0 + gw, y1 };
      gpcs.push(g);
      // 18 SMs per GPC: 3 across, 6 down
      const sx = (gw - 0.01) / 3, sy = (y1 - y0 - 0.012) / 6;
      for (let j = 0; j < 6; j++) for (let i = 0; i < 3; i++) {
        sms.push({ x0: x0 + 0.005 + i * sx + 0.002, y0: y0 + 0.006 + j * sy + 0.002, x1: x0 + 0.005 + (i + 1) * sx - 0.002, y1: y0 + 0.006 + (j + 1) * sy - 0.002 });
      }
    }
  }
  return { edge, band0, band1, top0, bot1, gpcs, sms };
}

// Die-local millimetres for a normalised point (x right, z down the canvas).
export const toMM = (u, v) => [(u - 0.5) * DIE_MM, (v - 0.5) * DIE_MM];

export function dieTexture(col) {
  const S = 1024, c = document.createElement('canvas');
  c.width = c.height = S;
  const g = c.getContext('2d');
  const fp = floorplan();
  const R = (o, inset = 0) => [o.x0 * S + inset, o.y0 * S + inset, (o.x1 - o.x0) * S - 2 * inset, (o.y1 - o.y0) * S - 2 * inset];
  g.fillStyle = col.base; g.fillRect(0, 0, S, S);
  g.lineWidth = 2;

  // HBM PHYs: three blocks a side; NVLink and PCIe strips top and bottom.
  for (const side of [0, 1]) for (let k = 0; k < 3; k++) {
    const x = side ? S * (1 - fp.edge) + 4 : 4, y = S * (0.07 + k * 0.295), w = S * fp.edge - 8, h = S * 0.27;
    g.fillStyle = col.phy; g.fillRect(x, y, w, h);
    g.strokeStyle = col.line;
    for (let t = 0; t < h; t += 10) { g.beginPath(); g.moveTo(x + 4, y + t); g.lineTo(x + w - 4, y + t); g.globalAlpha = 0.55; g.stroke(); }
    g.globalAlpha = 1;
    g.strokeRect(x, y, w, h);
  }
  for (const y of [8, S * fp.bot1 + 10]) {
    g.fillStyle = col.phy; g.fillRect(S * fp.edge + 8, y, S * (1 - 2 * fp.edge) - 16, S * 0.032);
    g.strokeStyle = col.line; g.strokeRect(S * fp.edge + 8, y, S * (1 - 2 * fp.edge) - 16, S * 0.032);
  }
  // L2 cache: two partitions either side of the crossbar, drawn as dense SRAM arrays.
  const by0 = S * fp.band0, bh = S * (fp.band1 - fp.band0);
  for (const [x0, x1] of [[fp.edge, 0.47], [0.53, 1 - fp.edge]]) {
    g.fillStyle = col.l2; g.fillRect(S * x0, by0, S * (x1 - x0), bh);
    g.strokeStyle = col.line; g.globalAlpha = 0.5;
    for (let x = S * x0 + 6; x < S * x1; x += 9) { g.beginPath(); g.moveTo(x, by0 + 4); g.lineTo(x, by0 + bh - 4); g.stroke(); }
    g.globalAlpha = 1;
    g.strokeRect(S * x0, by0, S * (x1 - x0), bh);
  }
  g.fillStyle = col.xbar; g.fillRect(S * 0.47 + 3, by0, S * 0.06 - 6, bh);
  // GPCs and their SMs: four processing blocks per SM, each with a tensor core, in consecutive hues
  // (col.tc is a list), the same order as the multiprocessor's own four.
  for (const gp of fp.gpcs) {
    g.fillStyle = col.gpc; g.fillRect(...R(gp));
    g.strokeStyle = col.line; g.lineWidth = 2.5; g.strokeRect(...R(gp)); g.lineWidth = 2;
  }
  for (const sm of fp.sms) {
    const [x, y, w, h] = R(sm);
    g.fillStyle = col.sm; g.fillRect(x, y, w, h);
    const qw = w / 2, qh = h / 2;
    for (let q = 0; q < 4; q++) {
      const qx = x + (q % 2) * qw, qy = y + Math.floor(q / 2) * qh;
      g.fillStyle = col.rf; g.fillRect(qx + 2, qy + 2, qw * 0.38, qh - 4);
      g.fillStyle = col.tc[q % col.tc.length]; g.fillRect(qx + qw * 0.5, qy + qh * 0.22, qw * 0.4, qh * 0.5);
    }
    g.strokeStyle = col.line; g.lineWidth = 1.5; g.strokeRect(x, y, w, h);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

export function dotsTexture(bg, dot, n = 64, r = 0.18) {
  const S = 512, c = document.createElement('canvas');
  c.width = c.height = S;
  const g = c.getContext('2d');
  g.fillStyle = bg; g.fillRect(0, 0, S, S);
  g.fillStyle = dot;
  const step = S / n;
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) { g.beginPath(); g.arc((x + 0.5) * step, (y + 0.5) * step, step * r, 0, 7); g.fill(); }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

export function tracesTexture(bg, line, alpha = 0.35) {
  const S = 1024, c = document.createElement('canvas');
  c.width = c.height = S;
  const g = c.getContext('2d');
  g.fillStyle = bg; g.fillRect(0, 0, S, S);
  g.strokeStyle = line; g.globalAlpha = alpha; g.lineWidth = 2; g.lineCap = 'round';
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 140; i++) {
    let x = rnd() * S, y = rnd() * S;
    g.beginPath(); g.moveTo(x, y);
    for (let k = 0; k < 4; k++) {
      const len = 40 + rnd() * 160, dir = Math.floor(rnd() * 4);
      if (dir === 0) x += len; else if (dir === 1) y += len; else if (dir === 2) { x += len * 0.7; y += len * 0.7; } else { x += len * 0.7; y -= len * 0.7; }
      g.lineTo(x, y);
    }
    g.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}
