// Packs Unitree's G1 humanoid (unitree_ros, BSD-3-Clause, robots/g1_description) into public/robot.bin for
// the robot beat (src/scene/robot.js): the visual mesh of every link, posed, in the stage's millimetres
// (y up, facing +z, the head's centre on the chip), simplified, quantized.
//   node scripts/robot.mjs <path to g1_description>
// The binary: a uint32 header length, the JSON header, then per part int16 positions and uint16 indices.
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import * as THREE from 'three';
import { MeshoptSimplifier } from 'meshoptimizer';

const DIR = process.argv[2];
if (!DIR) { console.error('usage: node scripts/robot.mjs <path to g1_description>'); process.exit(1); }
const URDF = 'g1_29dof_with_hand_rev_1_0.urdf';
const ERROR_MM = 0.45; // simplification error: under half a pixel at the closest framing
// A relaxed stance instead of the zero pose (radians): arms a little out and forward, elbows bent.
const POSE = {
  left_shoulder_pitch_joint: 0.25, right_shoulder_pitch_joint: 0.25,
  left_shoulder_roll_joint: 0.18, right_shoulder_roll_joint: -0.18,
  left_elbow_joint: 0.7, right_elbow_joint: 0.7,
};

const xml = readFileSync(join(DIR, URDF), 'utf8');
const attr = (s, tag, name) => s.match(new RegExp(`<${tag}[^>]*\\s${name}="([^"]*)"`))?.[1];
const nums = (s) => (s ?? '0 0 0').trim().split(/\s+/).map(Number);
const originOf = (s) => { const o = s.match(/<origin[^>]*\/>/)?.[0] ?? ''; return { xyz: nums(attr(o, 'origin', 'xyz')), rpy: nums(attr(o, 'origin', 'rpy')) }; };
const mat = ({ xyz, rpy }) => new THREE.Matrix4().compose(new THREE.Vector3(...xyz), new THREE.Quaternion().setFromEuler(new THREE.Euler(rpy[0], rpy[1], rpy[2], 'ZYX')), new THREE.Vector3(1, 1, 1));

const links = {};
for (const m of xml.matchAll(/<link name="([^"]+)">([\s\S]*?)<\/link>/g)) {
  const vis = m[2].match(/<visual>([\s\S]*?)<\/visual>/)?.[1];
  links[m[1]] = { name: m[1], mesh: vis && attr(vis, 'mesh', 'filename'), vis: vis && originOf(vis) };
}
const joints = [...xml.matchAll(/<joint name="([^"]+)" type="([^"]+)">([\s\S]*?)<\/joint>/g)].map((m) => ({
  name: m[1], type: m[2], parent: attr(m[3], 'parent', 'link'), child: attr(m[3], 'child', 'link'), origin: originOf(m[3]), axis: nums(attr(m[3], 'axis', 'xyz') ?? '1 0 0'),
}));

// World transforms at the pose, from the pelvis down every joint.
const world = { pelvis: new THREE.Matrix4() };
const pivot = { pelvis: new THREE.Vector3() };
const parentOf = {};
for (let changed = true; changed;) {
  changed = false;
  for (const j of joints) {
    if (world[j.child] || !world[j.parent]) continue;
    const q = new THREE.Matrix4().makeRotationAxis(new THREE.Vector3(...j.axis).normalize(), POSE[j.name] ?? 0);
    world[j.child] = world[j.parent].clone().multiply(mat(j.origin)).multiply(q);
    pivot[j.child] = new THREE.Vector3().setFromMatrixPosition(world[j.child]);
    parentOf[j.child] = j.parent;
    changed = true;
  }
}
// URDF is x forward, y left, z up, in metres; the stage is y up, facing +z, in millimetres.
const toStage = (v) => v.set(v.y * 1000, v.z * 1000, v.x * 1000);

// Which beat assembles a link, and its turn there.
function role(name) {
  const side = name.startsWith('left_') ? 1 : name.startsWith('right_') ? -1 : 0;
  const arm = ['shoulder_pitch', 'shoulder_roll', 'shoulder_yaw', 'elbow', 'wrist_roll', 'wrist_pitch', 'wrist_yaw', 'hand_palm', 'hand_thumb_0', 'hand_thumb_1', 'hand_thumb_2', 'hand_index_0', 'hand_index_1', 'hand_middle_0', 'hand_middle_1'];
  const leg = ['hip_pitch', 'hip_roll', 'hip_yaw', 'knee', 'ankle_pitch', 'ankle_roll'];
  const torso = ['pelvis', 'pelvis_contour_link', 'waist_yaw_link', 'waist_roll_link', 'torso_link']; // no logo_link: Unitree's mark isn't ours to show
  const key = name.replace(/^(left|right)_/, '').replace(/_link$/, '');
  if (arm.includes(key)) { const i = arm.indexOf(key); return { grp: 'arm', side, j: i < 7 ? i : 7 + (i - 7) * 0.35 }; }
  if (leg.includes(key)) return { grp: 'legs', side, j: leg.indexOf(key) };
  if (torso.includes(name)) return { grp: 'torso', side, j: torso.indexOf(name) };
  if (name === 'head_link') return { grp: 'head', side, j: 0 };
  return null;
}

function readSTL(buf) {
  const n = buf.readUInt32LE(80);
  if (84 + n * 50 === buf.length) {
    const p = new Float32Array(n * 9);
    for (let t = 0; t < n; t++) for (let k = 0; k < 9; k++) p[t * 9 + k] = buf.readFloatLE(84 + t * 50 + 12 + k * 4);
    return p;
  }
  return Float32Array.from([...buf.toString('utf8').matchAll(/vertex\s+(\S+)\s+(\S+)\s+(\S+)/g)].flatMap((m) => [+m[1], +m[2], +m[3]]));
}

// Indices and the positions they use, renumbered from 0.
function compact(indices, positions) {
  const old = indices.slice();
  const [remap, n] = MeshoptSimplifier.compactMesh(indices); // rewrites indices in place
  const out = new Float32Array(n * 3);
  for (const o of old) for (let k = 0; k < 3; k++) out[remap[o] * 3 + k] = positions[o * 3 + k];
  return [indices, out];
}

await MeshoptSimplifier.ready;
const parts = [];
const v = new THREE.Vector3();
for (const l of Object.values(links)) {
  const r = role(l.name);
  if (!l.mesh || !r || !world[l.name]) continue;
  const raw = readSTL(readFileSync(join(DIR, l.mesh)));
  const m = world[l.name].clone().multiply(mat(l.vis));
  for (let i = 0; i < raw.length; i += 3) { toStage(v.set(raw[i], raw[i + 1], raw[i + 2]).applyMatrix4(m)); raw[i] = v.x; raw[i + 1] = v.y; raw[i + 2] = v.z; }
  // Weld the STL's loose triangles, then simplify to the error budget.
  // (Compact first: unreferenced duplicates would leave every vertex looking like a seam, and nothing collapses.)
  const remap = MeshoptSimplifier.generatePositionRemap(raw, 3);
  const [welded, wpos] = compact(Uint32Array.from({ length: raw.length / 3 }, (_, i) => remap[i]), raw);
  const [simp] = MeshoptSimplifier.simplify(welded, wpos, 3, 0, ERROR_MM, ['ErrorAbsolute']);
  const [idx, pos] = compact(simp, wpos), nv = pos.length / 3;
  const p = toStage(pivot[l.name].clone()), pp = parentOf[l.name] ? toStage(pivot[parentOf[l.name]].clone()) : p.clone();
  if (process.env.STATS) console.log(l.name, raw.length / 9, '->', idx.length / 3, 'tris,', nv, 'verts');
  parts.push({ name: l.name, ...r, pivot: p, parentPivot: pp, pos, idx, tris0: raw.length / 9 });
}

// Centre the head on the chip (the stage's origin), its middle a little under it.
const head = new THREE.Box3();
const ph = parts.find((p) => p.name === 'head_link');
for (let i = 0; i < ph.pos.length; i += 3) head.expandByPoint(v.fromArray(ph.pos, i));
const shift = head.getCenter(new THREE.Vector3()).negate().add(new THREE.Vector3(0, -12, 0));
const all = new THREE.Box3();
for (const p of parts) {
  for (let i = 0; i < p.pos.length; i += 3) { v.fromArray(p.pos, i).add(shift).toArray(p.pos, i); all.expandByPoint(v); }
  p.pivot.add(shift); p.parentPivot.add(shift);
}
const c = all.getCenter(new THREE.Vector3()), half = all.getSize(new THREE.Vector3()).multiplyScalar(0.5);

const chunks = [], header = { license: 'Unitree G1 meshes, BSD-3-Clause, (c) 2016-2022 HangZhou YuShu TECHNOLOGY CO.,LTD. ("Unitree Robotics")', center: c.toArray(), half: half.toArray(), parts: [] };
let off = 0;
const push = (arr) => { const b = Buffer.from(arr.buffer, arr.byteOffset, arr.byteLength); const pad = (4 - (b.length % 4)) % 4; chunks.push(b, Buffer.alloc(pad)); const at = off; off += b.length + pad; return at; };
for (const p of parts) {
  const q = new Int16Array(p.pos.length);
  for (let i = 0; i < p.pos.length; i++) q[i] = Math.round(((p.pos[i] - c.getComponent(i % 3)) / half.getComponent(i % 3)) * 32767);
  const wide = q.length / 3 > 65536; // uint32 indices only where a part needs them
  const vAt = push(q), iAt = push(wide ? Uint32Array.from(p.idx) : Uint16Array.from(p.idx));
  header.parts.push({ wide, name: p.name, grp: p.grp, side: p.side, j: p.j, pivot: p.pivot.toArray().map((x) => +x.toFixed(2)), parentPivot: p.parentPivot.toArray().map((x) => +x.toFixed(2)), nv: q.length / 3, ni: p.idx.length, vAt, iAt });
}
const h = Buffer.from(JSON.stringify(header));
const hp = Buffer.concat([h, Buffer.alloc((4 - (h.length % 4)) % 4, 32)]);
const len = Buffer.alloc(4); len.writeUInt32LE(hp.length);
writeFileSync(new URL('../public/robot.bin', import.meta.url), Buffer.concat([len, hp, ...chunks]));
const tris = parts.reduce((a, p) => a + p.idx.length / 3, 0), tris0 = parts.reduce((a, p) => a + p.tris0, 0);
console.log(`${parts.length} parts, ${tris0} -> ${tris} triangles, ${((4 + hp.length + off) / 1e6).toFixed(2)} MB; bounds`, all.min.toArray().map(Math.round), all.max.toArray().map(Math.round));
for (const g of ['arm', 'torso', 'legs', 'head']) {
  const b = new THREE.Box3();
  for (const p of parts.filter((p) => p.grp === g)) for (let i = 0; i < p.pos.length; i += 3) b.expandByPoint(v.fromArray(p.pos, i));
  console.log(g, b.min.toArray().map(Math.round), b.max.toArray().map(Math.round));
}
