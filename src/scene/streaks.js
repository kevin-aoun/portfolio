// Fast streaks drawn over the line art: electrons running through the transistor, and data leaving the
// HBM stacks for the die. Each streak is a head and a fading tail of dots moving along a polyline, all
// in one instanced mesh drawn in its own pass after the edges, so it shows through the drawing.
import * as THREE from 'three';

const _m = new THREE.Matrix4(), _p = new THREE.Vector3(), _s = new THREE.Vector3(), _q = new THREE.Quaternion();
const _c = new THREE.Color(), WHITE = new THREE.Color(1, 1, 1);
export const FX_LAYER = 1;

// A soft round glow for the heads, drawn once.
let haloTex = null;
function halo() {
  if (haloTex) return haloTex;
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  const r = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(0.25, 'rgba(255,255,255,0.45)'); r.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = r; g.fillRect(0, 0, 64, 64);
  haloTex = new THREE.CanvasTexture(c);
  return haloTex;
}

export class Streaks {
  constructor(count, { trail = 7, size = 0.08, spacing = 0.05 } = {}) {
    this.trail = trail; this.size = size; this.spacing = spacing;
    this.items = Array.from({ length: count }, () => ({ on: false, pts: [], len: [], t0: 0, dur: 1, gain: 1, hue: 0 }));
    this.mesh = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 10, 8), new THREE.MeshBasicMaterial({ depthTest: false, depthWrite: false, toneMapped: false, transparent: true }), count * trail);
    this.mesh.frustumCulled = false;
    this.mesh.layers.set(FX_LAYER);
    this.mesh.setColorAt(0, _c.set(0, 0, 0));
    // One camera-facing glow per head; only on dark pages, where light adds up.
    // The gains keep a head (dot, its neighbour and the glow) under about 2x its hue, so the bright
    // hues stay themselves instead of adding up to white.
    this.glow = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: halo(), depthTest: false, depthWrite: false, toneMapped: false, transparent: true, blending: THREE.AdditiveBlending }), count);
    this.glow.frustumCulled = false;
    this.glow.layers.set(FX_LAYER);
    this.glow.setColorAt(0, _c.set(0, 0, 0));
    this.mesh.add(this.glow);
    this.hues = [0, 1, 2, 3, 4].map(() => new THREE.Color()); // the token hues, set by setTheme
    this.mode = 'add';
    this.hideAll();
  }
  // Dark pages add light; light pages multiply the hue in, so the same streak reads on either.
  setTheme(hues, mode) {
    hues.forEach((h, i) => this.hues[i].set(h));
    this.mode = mode;
    const m = this.mesh.material;
    m.blending = mode === 'add' ? THREE.AdditiveBlending : THREE.MultiplyBlending;
    m.premultipliedAlpha = mode !== 'add';
    m.needsUpdate = true;
    // Light pages get a soft halo too, drawn over the paper rather than added.
    this.glow.material.blending = mode === 'add' ? THREE.AdditiveBlending : THREE.NormalBlending;
    this.glow.material.needsUpdate = true;
  }
  hideAll() {
    _s.setScalar(0);
    for (let i = 0; i < this.mesh.count; i++) this.mesh.setMatrixAt(i, _m.compose(_p.set(0, 0, 0), _q, _s));
    for (let i = 0; i < this.glow.count; i++) this.glow.setMatrixAt(i, _m.compose(_p.set(0, 0, 0), _q, _s));
    this.mesh.instanceMatrix.needsUpdate = true;
    this.glow.instanceMatrix.needsUpdate = true;
    this.items.forEach((it) => { it.on = false; });
    this.active = 0;
  }
  // pts: two or more points (local space of the mesh's parent). The streak covers them at an even speed.
  spawn(pts, now, dur, gain = 1) {
    const it = this.items.find((x) => !x.on);
    if (!it) return false;
    it.on = true; it.t0 = now; it.dur = dur; it.gain = gain;
    it.hue = (Math.random() * this.hues.length) | 0; // each streak keeps one hue for its whole life
    it.pts = pts.map((p) => p.clone());
    it.len = [0];
    for (let i = 1; i < pts.length; i++) it.len.push(it.len[i - 1] + pts[i].distanceTo(pts[i - 1]));
    this.active++;
    return true;
  }
  at(it, u, out) {
    const L = it.len[it.len.length - 1] * Math.min(1, Math.max(0, u));
    let i = 1;
    while (i < it.len.length - 1 && it.len[i] < L) i++;
    const seg = it.len[i] - it.len[i - 1] || 1;
    return out.lerpVectors(it.pts[i - 1], it.pts[i], (L - it.len[i - 1]) / seg);
  }
  update(now, camera) {
    if (!this.active) return;
    const face = camera ? camera.quaternion : _q;
    const { trail, size, spacing } = this;
    _s.setScalar(0);
    let active = 0;
    this.items.forEach((it, i) => {
      if (!it.on) return;
      const base = i * trail;
      const u = (now - it.t0) / it.dur;
      if (u > 1 + spacing * trail) {
        it.on = false;
        for (let k = 0; k < trail; k++) this.mesh.setMatrixAt(base + k, _m.compose(_p, _q, _s.setScalar(0)));
        this.glow.setMatrixAt(i, _m.compose(_p, _q, _s.setScalar(0)));
        return;
      }
      active++;
      const hu = Math.min(1, u), fade = u > 1 ? Math.max(0, 1 - (u - 1) / (spacing * trail)) : 1, hue = this.hues[it.hue];
      this.at(it, hu, _p);
      this.glow.setMatrixAt(i, _m.compose(_p, face, _s.setScalar(size * 9 * fade)));
      if (this.mode === 'add') this.glow.setColorAt(i, _c.copy(hue).multiplyScalar(0.4 * it.gain * fade));
      else this.glow.setColorAt(i, _c.copy(WHITE).lerp(hue, 0.35 * it.gain * fade));
      for (let k = 0; k < trail; k++) {
        const uk = u - k * spacing;
        const shown = uk >= 0 && uk <= 1;
        const fall = 1 - k / trail;
        this.at(it, uk, _p);
        _s.setScalar(shown ? size * (0.3 + 0.7 * fall) : 0);
        this.mesh.setMatrixAt(base + k, _m.compose(_p, _q, _s));
        const v = shown ? fall * fall * it.gain : 0;
        if (this.mode === 'add') _c.copy(hue).multiplyScalar(v * 0.85);
        else _c.copy(WHITE).lerp(hue, Math.min(1, v));
        this.mesh.setColorAt(base + k, _c);
      }
    });
    this.active = active;
    this.mesh.instanceMatrix.needsUpdate = true;
    this.mesh.instanceColor.needsUpdate = true;
    this.glow.instanceMatrix.needsUpdate = true;
    this.glow.instanceColor.needsUpdate = true;
  }
}
