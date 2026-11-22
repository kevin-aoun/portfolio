// The machine, built from boxes. Each act is a group: the transistor (T), the logic array around it (L),
// one streaming multiprocessor (C), and the die with its package and board (D, in millimetres).
import * as THREE from 'three';
import { floorplan, toMM, DIE_MM } from './textures.js';

const UNIT = new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0); // origin at the bottom face
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _p = new THREE.Vector3(), _s = new THREE.Vector3(), _e = new THREE.Euler();
const ease = (t) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));

// Boxes of one role drawn as a single instanced mesh. Each box can rise into place on its own delay.
class Boxes extends THREE.InstancedMesh {
  constructor(role, items, geom = UNIT) {
    super(geom, new THREE.MeshBasicMaterial(), Math.max(1, items.length));
    this.role = role;
    this.items = items;
    this.count = items.length;
    this.frustumCulled = false;
    this.rise = -1;
    this.setRise(1);
  }
  // t: 0 hidden, 1 in place. `lift` drops boxes in from above instead of growing them.
  setRise(t, { spread = 0.35, lift = 0 } = {}) {
    if (t === this.rise && !lift) return;
    this.rise = t;
    this.items.forEach((b, i) => {
      const k = b.key ?? 0;
      const f = ease(t * (1 + spread) - k * spread);
      const shown = f > 0.001;
      _p.set(b.x, b.y + (lift ? (1 - f) * lift : 0), b.z);
      _e.set(0, b.ry ?? 0, 0); _q.setFromEuler(_e);
      _s.set(shown ? b.w : 0, shown ? b.h * (lift ? 1 : f) : 0, shown ? b.d : 0); // zero scale: degenerate, never drawn
      this.setMatrixAt(i, _m.compose(_p, _q, _s));
    });
    this.instanceMatrix.needsUpdate = true;
  }
}

const B = (x, y, z, w, h, d, extra = {}) => ({ x, y, z, w, h, d, ...extra });

// --- T: one FinFET, about 7 units across --------------------------------------------------------
// Faceted source/drain epitaxy: a prism along the fin with a diamond cross-section, bottom tip at y = 0.
const DIAMOND = new THREE.BoxGeometry(1, Math.SQRT1_2, Math.SQRT1_2).rotateX(Math.PI / 4).translate(0, 0.5, 0);
export const FINS = [-1.3, 0, 1.3];
function transistor() {
  const group = new THREE.Group();
  const fins = FINS;
  const parts = {
    substrate: new Boxes('silicon', [B(0, -0.9, 0, 7.2, 0.9, 5.2)]),
    oxide: new Boxes('oxide', [B(0, 0, 0, 7.2, 0.38, 5.2)]),
    fins: new Boxes('fin', fins.map((z) => B(0, 0, z, 6.6, 1.3, 0.34))),
    gate: new Boxes('gate', [B(0, 0.38, 0, 0.9, 1.75, 4.4)]),
    spacers: new Boxes('oxide2', [B(-0.6, 0.38, 0, 0.28, 1.5, 4.4), B(0.6, 0.38, 0, 0.28, 1.5, 4.4)]),
    epi: new Boxes('epi', fins.flatMap((z) => [-2.05, 2.05].map((x) => B(x, 0.42, z, 1.9, 1.15, 1.12))), DIAMOND),
    contacts: new Boxes('contact', [B(-2.05, 1.32, 0, 0.55, 1.2, 4.0), B(2.05, 1.32, 0, 0.55, 1.2, 4.0), B(0, 2.13, 1.55, 0.55, 0.6, 0.55)]),
  };
  Object.values(parts).forEach((m) => group.add(m));
  return { group, parts };
}

// --- L: the transistor among its neighbours, with wiring dropping in on top ----------------------
const COLS = 13, ROWS = 9, PX = 7.6, PZ = 5.6;
function logic() {
  const group = new THREE.Group();
  const cells = [];
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
    const i = c - (COLS - 1) / 2, j = r - (ROWS - 1) / 2;
    if (i === 0 && j === 0) continue; // the hero transistor sits here
    cells.push({ x: i * PX, z: j * PZ, key: Math.min(1, Math.hypot(i / COLS, j / ROWS) * 1.6), nand: (i === 1 && j === 0) || (i === 0 && j === 1) || (i === 1 && j === 1) });
  }
  const fins = [], gates = [], contacts = [];
  cells.forEach((c, n) => {
    for (const z of [-1.3, 0, 1.3]) fins.push(B(c.x, 0, c.z + z, 6.4, 1.2, 0.34, { key: c.key, cell: n }));
    gates.push(B(c.x, 0.38, c.z, 0.9, 1.6, 4.4, { key: c.key, cell: n }));
    contacts.push(B(c.x - 2.05, 1.2, c.z, 0.55, 1.1, 3.8, { key: c.key, cell: n }), B(c.x + 2.05, 1.2, c.z, 0.55, 1.1, 3.8, { key: c.key, cell: n }));
  });
  const slab = new Boxes('silicon', [B(0, -0.9, 0, COLS * PX, 0.9, ROWS * PZ, { key: 0 })]);
  const oxide = new Boxes('oxide', [B(0, 0, 0, COLS * PX, 0.38, ROWS * PZ, { key: 0 })]);
  const m = {
    slab, oxide,
    fins: new Boxes('fin', fins),
    gates: new Boxes('gate', gates),
    contacts: new Boxes('contact', contacts),
  };
  // Two wiring layers: M1 runs along x, M2 along z, each on its own height.
  const w1 = [], w2 = [];
  for (let k = 0; k < ROWS * 2; k++) w1.push(B(0, 3.0, (k - ROWS + 0.5) * (PZ / 2), COLS * PX * 0.98, 0.32, 0.55, { key: k / (ROWS * 2) }));
  for (let k = 0; k < COLS * 2; k++) w2.push(B((k - COLS + 0.5) * (PX / 2), 4.3, 0, 0.55, 0.32, ROWS * PZ * 0.98, { key: k / (COLS * 2) }));
  m.m1 = new Boxes('wire', w1);
  m.m2 = new Boxes('wire', w2);
  Object.values(m).forEach((x) => group.add(x));
  const labels = [
    { text: 'NAND gate: four transistors', at: [PX * 0.5, 2.0, PZ * 0.5 + 3.2], beats: ['logic'], prio: 1 },
    { text: 'Copper wiring', at: [-PX * 3, 4.6, PZ * 3.5], beats: ['logic'] },
  ].map((l) => ({ ...l, obj: group }));
  const box = new THREE.Box3(new THREE.Vector3(-COLS * PX / 2, -0.9, -ROWS * PZ / 2), new THREE.Vector3(COLS * PX / 2, 4.6, ROWS * PZ / 2));
  return { group, m, cells, labels, box };
}

// --- C: one streaming multiprocessor as a small city of blocks -----------------------------------
export const PATCH = [-9.2, -4.6]; // where the logic array lives inside the SM
function core() {
  const group = new THREE.Group();
  let seed = 11;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const roles = { base: [], tc: [], rf: [], alu: [], l1: [], ctl: [] };
  roles.base.push(B(0, -0.6, 0, 36, 0.6, 24, { key: 0 }));
  // Four processing blocks around the shared L1 band.
  for (const [qx, qz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    const cx = qx * 9.2, cz = qz * 6.6;
    const k = () => Math.min(1, rnd() * 0.6 + Math.hypot(cx, cz) / 30);
    roles.tc.push(B(cx + 3.2, 0, cz, 5.2, 1.5, 4.6, { key: k() }));
    roles.rf.push(B(cx - 4.6, 0, cz, 3.2, 2.1, 7.6, { key: k() }));
    roles.ctl.push(B(cx + 0.2, 0, cz + qz * -3.4, 6.5, 0.9, 1.2, { key: k() }));
    for (let a = 0; a < 4; a++) for (let b = 0; b < 4; b++) roles.alu.push(B(cx - 1.8 + a * 0.95, 0, cz - 1.6 + b * 1.05 + qz * 0.4, 0.7, 0.55 + rnd() * 0.25, 0.75, { key: k() }));
  }
  roles.l1.push(B(0, 0, 0, 33, 1.0, 3.0, { key: 0.2 }));
  roles.ctl.push(B(-14.5, 0, 0, 3.4, 1.2, 3.0, { key: 0.3 }), B(14.5, 0, 0, 3.4, 1.2, 3.0, { key: 0.3 }));
  const m = {
    base: new Boxes('smbase', roles.base),
    tc: new Boxes('tensor', roles.tc),
    rf: new Boxes('regfile', roles.rf),
    alu: new Boxes('alu', roles.alu),
    l1: new Boxes('l1', roles.l1),
    ctl: new Boxes('ctl', roles.ctl),
  };
  Object.values(m).forEach((x) => group.add(x));
  const box = new THREE.Box3(new THREE.Vector3(-18, -0.6, -12), new THREE.Vector3(18, 2.1, 12));
  return { group, m, box };
}

// --- D: die, HBM, interposer, substrate and the SXM board, in millimetres -----------------------
const DIE_H = 0.8, INT_H = 0.6, SUB_H = 1.4, PCB_H = 1.6;
export const HBM = { w: 11, d: 10, layers: 8 };
function die() {
  const group = new THREE.Group();
  const fp = floorplan();
  // The chosen SM (where the multiprocessor lands) is one near the centre of a top GPC.
  const pick = fp.sms[1 * 18 + 3 * 3 + 2];
  const [tx, tz] = toMM((pick.x0 + pick.x1) / 2, (pick.y0 + pick.y1) / 2);
  const tileW = (pick.x1 - pick.x0) * DIE_MM, tileD = (pick.y1 - pick.y0) * DIE_MM;

  const dieMesh = new THREE.Mesh(new THREE.BoxGeometry(DIE_MM, DIE_H, DIE_MM).translate(0, DIE_H / 2, 0), [1, 2, 3, 4, 5, 6].map(() => new THREE.MeshBasicMaterial()));
  dieMesh.role = 'die';
  const dieG = new THREE.Group();
  dieG.add(dieMesh);
  // One quad per SM, lit as tokens are generated.
  const overlay = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 0.02, 1).translate(0, 0.01, 0), new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false }), fp.sms.length);
  overlay.role = 'pulse';
  overlay.frustumCulled = false;
  fp.sms.forEach((s, i) => {
    const [x, z] = toMM((s.x0 + s.x1) / 2, (s.y0 + s.y1) / 2);
    overlay.setMatrixAt(i, _m.compose(_p.set(x, DIE_H + 0.004, z), _q.identity(), _s.set((s.x1 - s.x0) * DIE_MM, 1, (s.y1 - s.y0) * DIE_MM)));
    overlay.setColorAt(i, new THREE.Color(0, 0, 0));
  });
  overlay.smCenters = fp.sms.map((s) => toMM((s.x0 + s.x1) / 2, (s.y0 + s.y1) / 2));
  dieG.add(overlay);
  group.add(dieG);

  const interposer = new THREE.Mesh(new THREE.BoxGeometry(57, INT_H, 37).translate(0, INT_H / 2, 0), [1, 2, 3, 4, 5, 6].map(() => new THREE.MeshBasicMaterial()));
  interposer.role = 'interposer';
  group.add(interposer);

  // HBM: six stacks, three a side. Each is a base die, eight DRAM dies and a cap; they spread apart when exploded.
  const stacks = [];
  for (const sx of [-1, 1]) for (const sz of [-1, 0, 1]) stacks.push([sx * (DIE_MM / 2 + 1.4 + HBM.w / 2), sz * 12.2]);
  const layerH = [0.1, ...Array(HBM.layers).fill(0.07), 0.14];
  const hbmItems = [];
  stacks.forEach(([x, z], s) => layerH.forEach((h, l) => hbmItems.push({ x, z, w: HBM.w, h, d: HBM.d, l, key: s / 6 })));
  const hbm = new Boxes('dram', hbmItems);
  hbm.layerH = layerH;
  group.add(hbm);
  // Assembled, each stack is drawn as one block: ten layers under a pixel tall each would ink solid.
  const stackH = layerH.reduce((a, h) => a + h, 0);
  const hbmSolid = new Boxes('dram', stacks.map(([x, z]) => B(x, INT_H, z, HBM.w, stackH, HBM.d)));
  group.add(hbmSolid);
  // H100 SXM wires up five of its six stacks; the glow on each live stack's lid shows memory traffic.
  const live = [0, 1, 2, 3, 4];
  // The memory gauge: each live stack's eight DRAM dies as a 2 x 4 grid of cells on its lid (2 GB each).
  const memCells = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 0.02, 1).translate(0, 0.01, 0), new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false }), live.length * 8);
  memCells.role = 'pulse';
  memCells.frustumCulled = false;
  memCells.cells = [];
  live.forEach((s, i) => {
    const [x, z] = stacks[s];
    for (let c = 0; c < 8; c++) {
      const cx = x + ((c % 2) - 0.5) * (HBM.w / 2), cz = z + (Math.floor(c / 2) - 1.5) * (HBM.d / 4);
      memCells.cells.push({ die: c, stack: i });
      memCells.setMatrixAt(i * 8 + c, _m.compose(_p.set(cx, INT_H + stackH + 0.006, cz), _q.identity(), _s.set(HBM.w / 2 - 0.7, 1, HBM.d / 4 - 0.6)));
      memCells.setColorAt(i * 8 + c, new THREE.Color(0, 0, 0));
    }
  });
  group.add(memCells);
  const hbmGlow = new THREE.InstancedMesh(new THREE.BoxGeometry(HBM.w, 0.03, HBM.d).translate(0, 0.015, 0), new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false }), live.length);
  hbmGlow.role = 'pulse';
  hbmGlow.frustumCulled = false;
  live.forEach((s, i) => hbmGlow.setColorAt(i, new THREE.Color(0, 0, 0)));
  group.add(hbmGlow);

  const substrate = new Boxes('substrate', [B(0, -SUB_H, 0, 80, SUB_H, 66)]);
  group.add(substrate);
  // Decoupling capacitors on the substrate, around the interposer.
  const caps = [];
  for (let k = 0; k < 18; k++) { caps.push(B(-36 + k * 4.2, 0, -26.5, 1.6, 0.6, 0.8, { key: k / 18 }), B(-36 + k * 4.2, 0, 26.5, 1.6, 0.6, 0.8, { key: k / 18 })); }
  for (let k = 0; k < 10; k++) { caps.push(B(-35, 0, -20 + k * 4.4, 0.8, 0.6, 1.6, { key: k / 10 }), B(35, 0, -20 + k * 4.4, 0.8, 0.6, 1.6, { key: k / 10 })); }
  const smd = new Boxes('smd', caps);
  group.add(smd);

  // The SXM board: power stages and inductors in columns, capacitor banks, connectors underneath.
  const board = new THREE.Group();
  const pcb = new THREE.Mesh(new THREE.BoxGeometry(150, PCB_H, 96).translate(0, -PCB_H / 2, 0), [1, 2, 3, 4, 5, 6].map(() => new THREE.MeshBasicMaterial()));
  pcb.role = 'pcb';
  pcb.position.set(18, -SUB_H - 0.5, 0);
  board.add(pcb);
  const top = -SUB_H - 0.5;
  const stages = [], inductors = [], bcaps = [], conns = [];
  for (let r = 0; r < 8; r++) for (const cx of [52, 64, 76]) {
    const z = -38 + r * 10.8, k = r / 8;
    stages.push(B(cx, top, z, 4.6, 0.9, 4.6, { key: k }));
    inductors.push(B(cx + 6, top, z, 5.4, 3.6, 5.4, { key: k }));
  }
  for (let r = 0; r < 7; r++) for (const cz of [-41, 41]) { stages.push(B(-30 + r * 9, top, cz, 4.6, 0.9, 4.6, { key: 0.3 + r / 14 })); inductors.push(B(-30 + r * 9, top, cz + (cz < 0 ? 6 : -6), 5.4, 3.6, 5.4, { key: 0.3 + r / 14 })); }
  for (let k = 0; k < 22; k++) bcaps.push(B(-50 + (k % 11) * 2.4, top, k < 11 ? -14 : 14, 1.6, 2.4, 1.6, { key: 0.5 + k / 44 }));
  for (let k = 0; k < 16; k++) bcaps.push(B(-54, top, -18 + k * 2.4, 1.6, 2.4, 1.6, { key: 0.6 + k / 40 }));
  conns.push(B(18, top - PCB_H - 3.5, -24, 70, 3.5, 7, { key: 0 }), B(18, top - PCB_H - 3.5, 24, 70, 3.5, 7, { key: 0 }));
  const bm = { stages: new Boxes('stage', stages), inductors: new Boxes('inductor', inductors), caps: new Boxes('cap', bcaps), conns: new Boxes('conn', conns) };
  Object.values(bm).forEach((x) => board.add(x));
  group.add(board);

  return { group, dieG, dieMesh, overlay, interposer, hbm, hbmSolid, memCells, hbmGlow, live, stacks, substrate, smd, board, pcb, bm, tile: { x: tx, z: tz, w: tileW, d: tileD }, DIE_MM, DIE_H, INT_H };
}


export function buildModels() {
  const T = transistor(), L = logic(), C = core(), D = die();
  return { T, L, C, D };
}
