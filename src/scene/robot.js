// The robot the GPU ends up in: Unitree's G1 humanoid (meshes BSD-3-Clause, (c) Unitree Robotics; packed by
// scripts/robot.mjs into public/robot.bin), in millimetres around the chip: its head's centre sits just under
// the die, and it faces +z. Every link is one part, with its motors, brackets and bolts, drawn by the same
// edge pass as the rest. Each part has a home pose and an exploded one. The scroll brings the parts on
// around the chip, then assembles them a group at a time (arms, torso, legs); the chip, lifted out of the way
// meanwhile, comes back down, the head closes over it, and the whole body lights up, head to toe.
import * as THREE from 'three';
import { toCreasedNormals } from 'three/addons/utils/BufferGeometryUtils.js';

const LIFT = 260; // how high the chip waits above the head while the body assembles
const clamp = (x) => Math.min(1, Math.max(0, x));
const ease = (t) => (t <= 0 ? 0 : t >= 1 ? 1 : t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const CREASE = (32 * Math.PI) / 180; // edges sharper than this are inked; rounder ones read as smooth

// Where a part floats, exploded (mm): an arm pulled apart down its chain and out to its side, a leg mostly
// downward (clear of the arms), the torso along its depth, the head up and behind, so the chip has a clear
// way down into its place and stays in sight.
function exploded({ grp, side: s, j, name }) {
  if (grp === 'arm') return [s * (110 + 30 * j), 40 - 36 * j, 24 * j + (j > 7 ? 60 : 0)];
  if (grp === 'legs') return [s * (40 + 16 * j), -110 - 56 * j, 22 * j + (name.includes('ankle_roll') ? 60 : 0)];
  if (grp === 'head') return [0, 200, -170];
  return [[0, -170, 0], [0, -110, -90], [0, -50, 150], [0, 0, 210], [0, 130, 60]][j];
}

export function buildRobot() {
  const group = new THREE.Group();
  const parts = [];
  let span = {};
  // The parts arrive with the file; until then the robot is just empty.
  async function load(url) {
    const buf = await (await fetch(url)).arrayBuffer();
    const hl = new DataView(buf).getUint32(0, true);
    const head = JSON.parse(new TextDecoder().decode(new Uint8Array(buf, 4, hl)));
    const at = 4 + hl, [cx, cy, cz] = head.center, [hx, hy, hz] = head.half;
    let seed = 7;
    const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647 - 0.5; };
    for (const h of head.parts) {
      const q = new Int16Array(buf, at + h.vAt, h.nv * 3);
      const pv = new THREE.Vector3(...h.pivot);
      // Positions about the part's own joint, so the exploded spin turns it there.
      const pos = new Float32Array(h.nv * 3);
      for (let i = 0; i < pos.length; i += 3) {
        pos[i] = (q[i] / 32767) * hx + cx - pv.x; pos[i + 1] = (q[i + 1] / 32767) * hy + cy - pv.y; pos[i + 2] = (q[i + 2] / 32767) * hz + cz - pv.z;
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      g.setIndex(new THREE.BufferAttribute(h.wide ? new Uint32Array(buf, at + h.iAt, h.ni) : new Uint16Array(buf, at + h.iAt, h.ni), 1));
      const geo = toCreasedNormals(g, CREASE);
      g.dispose();
      geo.computeBoundingBox();
      const mid = geo.boundingBox.getCenter(new THREE.Vector3()).add(pv);
      const mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ toneMapped: false }));
      mesh.frustumCulled = false;
      mesh.visible = false;
      const off = new THREE.Vector3(...exploded(h));
      parts.push({
        mesh, home: pv, off, grp: h.grp, j: h.j, f: -1, flash: -1e9, hue: parts.length % 5,
        // Shells light, the small links between them (motors, brackets) darker.
        tone: h.grp === 'head' || h.grp === 'torso' ? 1 : Math.round(h.j) % 2 ? 3 : 1,
        spin: h.grp === 'head' ? new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -0.45) : new THREE.Quaternion().setFromEuler(new THREE.Euler(rnd() * 0.7, rnd() * 0.7, rnd() * 0.7)),
        kin: clamp(off.clone().add(mid).length() / 1500), // nearer the chip, sooner on
        delay: ((90 - mid.y) / 1320) * 620, // the light-up runs head to toe
      });
      group.add(mesh);
    }
    span = {};
    for (const p of parts) span[p.grp] = Math.max(span[p.grp] ?? 0, p.j);
    for (const p of parts) p.k = span[p.grp] ? p.j / span[p.grp] : 0;
    paint();
  }

  // --- per frame ---
  const base = [0, 1, 2, 3].map(() => new THREE.Color()), glow = [0, 1, 2, 3, 4].map(() => new THREE.Color());
  const _q = new THREE.Quaternion();
  let lastHead = 0, lastGlow = false, g0 = -1e9;
  const STEP = 70, FADE = 260; // the light-up: each part runs through the five hues, 70 ms each, then fades
  const paint = () => parts.forEach((p) => p.mesh.material.color.copy(base[p.tone]));
  function setTheme(P, hueCol, fillCol) {
    P.tones.forEach((t, i) => base[i].set(t));
    // On the dark page a lit part fills with its hue's light; on paper it takes the hue's tint. Either way
    // the edge pass then inks it in that hue.
    glow.forEach((g, i) => (P.fx === 'add' ? g.copy(hueCol[i]).multiplyScalar(0.55) : g.copy(fillCol[i])));
    paint();
  }
  // p: the stage's params (robIn, arm, torso, legs, head, open, chipUp, glow). Returns the chip's lift and
  // whether the head has just closed on it (the stage flashes the die then).
  function update(p, now, reduced) {
    const lift = LIFT * p.chipUp * (1 - ease(clamp(p.head / 0.45)));
    const boot = p.head >= 0.92 && lastHead < 0.92 && !reduced;
    lastHead = p.head;
    const on = p.glow > 0.5;
    if (on && !lastGlow && !reduced) g0 = now;
    lastGlow = on;
    group.visible = p.robIn > 0.001 && parts.length > 0;
    if (!group.visible) return { lift, boot };
    const headT = clamp((p.head - 0.42) / 0.45), open = ease(clamp(p.open));
    for (const part of parts) {
      const { mesh } = part;
      const t = part.grp === 'head' ? headT : p[part.grp];
      const sp = Math.max(1, span[part.grp] * 0.5);
      let f = ease(clamp(t * (1 + sp) - part.k * sp));
      if (part.grp === 'head') f *= 1 - open;
      if (f >= 1 && part.f < 1 && part.f >= 0 && !reduced) part.flash = now;
      part.f = f;
      const pop = ease(clamp(p.robIn * 2.2 - part.kin * 1.2));
      mesh.visible = pop > 0.001;
      if (!mesh.visible) continue;
      mesh.position.copy(part.home).addScaledVector(part.off, 1 - f);
      mesh.quaternion.copy(_q.set(0, 0, 0, 1).slerp(part.spin, 1 - f));
      mesh.scale.setScalar(pop);
      // Colour: a part's flash as it locks in, then the light-up sweeping past.
      let k = 0, c = null;
      const fl = now - part.flash;
      if (fl < 380) { k = Math.pow(1 - fl / 380, 2) * 0.55; c = glow[part.hue]; }
      const tau = now - g0 - part.delay;
      if (tau >= 0 && tau < 5 * STEP + FADE) {
        const env = tau < 5 * STEP ? 1 : 1 - (tau - 5 * STEP) / FADE;
        if (env >= k) { k = env; c = glow[Math.min(4, Math.floor(tau / STEP))]; }
      }
      mesh.material.color.copy(base[part.tone]);
      if (c) mesh.material.color.lerp(c, k);
    }
    return { lift, boot };
  }
  return { group, parts, load, setTheme, update };
}
