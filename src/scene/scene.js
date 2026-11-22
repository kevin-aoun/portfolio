// The stage: one Three.js scene with the machine nested at real relative scales (transistor inside the
// logic array inside a streaming multiprocessor inside the die), so the scroll is one continuous zoom.
// Drawn as line art: a flat colour pass, a normal/depth pass, and an edge shader that inks the creases.
import * as THREE from 'three';
import { buildModels, PATCH, FINS } from './models.js';
import { dieTexture, dotsTexture, tracesTexture } from './textures.js';
import { Streaks, FX_LAYER } from './streaks.js';
import { layoutCallouts } from './callouts.js';
import { buildRobot } from './robot.js';
import { brush, CELL, MAJOR, DIM } from '../grid.js';
import { stageAura, auraAt, current, sweepAura } from '../aura.js';

const S_CORE = 0.03;  // logic array inside the SM
const S_DIE = 0.064;  // SM inside the die (mm)
// Phones, and phones on their side: the same test as the stylesheets' stacked layout.
const PHONE_Q = '(max-width: 900px), (max-width: 1000px) and (max-height: 500px)';

// hues: the tokenizer's five colours (c0..c4) as lines and light, as in base.css; fills: the same, soft, for
// tinted surfaces (the tokenizer's translucent tints, as in base.css, at 0.75 of their strength over the page).
const PALETTES = {
  dark: {
    bg: '#0c0c0b', ink: '#d6d3c8', inkMix: 0.8, grid: ['#ecebe5', 0.06, 0.12], fx: 'add', warm: [0.008, 0.02], vignette: 0.62,
    hues: ['#8965fe', '#51e26d', '#faaa07', '#fb2438', '#04b6ee'],
    fills: ['#281c48', '#2e5b35', '#63481b', '#612021', '#164b5f'],
    tones: ['#0c0c0b', '#121211', '#181816', '#1f1e1b'],
    die: { base: '#0e0e0d', gpc: '#121211', sm: '#0e0e0d', rf: '#191816', l2: '#141412', phy: '#191816', xbar: '#1f1e1b', line: '#77736a' },
    dots: '#3c3a34', traces: '#5a574e',
  },
  light: {
    bg: '#f1efea', ink: '#1d1b17', inkMix: 0.9, grid: ['#191814', 0.085, 0.15], fx: 'mul', warm: [0.08, 0.18], vignette: 0.2,
    hues: ['#7021f3', '#00750b', '#965400', '#c90b26', '#006a9c'],
    fills: ['#c9bae5', '#bee9c0', '#f2d6a6', '#f0aeac', '#a5d9ea'],
    tones: ['#f1efea', '#e8e6e1', '#dedcd6', '#d2d0c9'],
    die: { base: '#f1efea', gpc: '#e8e6e1', sm: '#f1efea', rf: '#dedcd6', l2: '#e8e6e1', phy: '#dedcd6', xbar: '#d2d0c9', line: '#1d1b17' },
    dots: '#1d1b17', traces: '#1d1b17',
  },
};
// 'a': each instance in the next token hue, c0, c1, ...
const TONE = { silicon: 2, oxide: 1, fin: 1, gate: 3, oxide2: 1, epi: 2, contact: 3, wire: 3, smbase: 1, tensor: 'a', regfile: 2, alu: 1, l1: 2, ctl: 3, dram: 1, substrate: 2, smd: 3, stage: 3, inductor: 2, cap: 1, conn: 1 };

// Camera keys. Below the die the drawing is schematic, so those keys carry the real field-of-view width
// (`fov`, metres, at a 16:10 screen; the fin pitch is about 28 nm). `in` names the space the target lives in; `d` is the view size in that space's units;
// `f` is where the target sits on screen (0..1, x and y), `pf` the same on phones, `pz` the phone zoom.
// Holds come in A/B pairs: the camera drifts from A to B while the text is up.
const rotY = (v, a) => [v[0] * Math.cos(a) + v[2] * Math.sin(a), v[1], -v[0] * Math.sin(a) + v[2] * Math.cos(a)];
const hold = (name, k, orbit = 0.12) => ({ [`${name}A`]: k, [`${name}B`]: { ...k, dir: rotY(k.dir, orbit), p: { ...k.p, ...k.pB } } });
const BASE = { tOn: 1, eOn: 0, arr: 1, wires: 1, nand: 0, toC: 1, toD: 1, pkg: 1, sub: 1, expl: 0, board: 1, power: 1, dim: 0 };
const ROB = { ...BASE, board: 0, sub: 0 };
const KEYS = {
  hero: { in: 'T', t: [0, 0.75, 0], dir: [6.4, 4.4, 8.2], d: 14.5, f: [0.5, 0.5], pf: [0.5, 0.46], pz: 2.5, fov: 3.05e-7, p: { tOn: 0, eOn: 1, pace: 0 } },
  ...hold('logic', { in: 'L', t: [3, 0, 2], dir: [0.36, 0.64, 0.68], d: 250, f: [0.32, 0.5], fov: 5.3e-6, p: { tOn: 1, arr: 1, wires: 1, nand: 1 } }),
  ...hold('core', { in: 'C', t: [0, 0, 0], dir: [0.42, 0.62, 0.66], d: 90, f: [0.5, 0.5], fov: 5.6e-3, p: { tOn: 1, arr: 1, wires: 1, toC: 1 } }),
  ...hold('die', { in: 'D', t: [0, 1.4, 0], dir: [0.4, 0.7, 0.6], d: 92, f: [0.5, 0.5], p: { ...BASE, pkg: 0, board: 0, power: 0 } }),
  packageA: { in: 'D', t: [0, 6, 0], dir: [0.5, 0.5, 0.71], d: 195, f: [0.5, 0.52], pz: 2.5, p: { ...BASE, expl: 1, board: 0, power: 0 } },
  packageB: { in: 'D', t: [0, 1, 0], dir: [0.6, 0.44, 0.67], d: 190, f: [0.5, 0.52], pz: 2.5, p: { ...BASE, expl: 0, board: 0, power: 0 } },
  ...hold('board', { in: 'D', t: [16, -2, 0], dir: [0.42, 0.6, 0.68], d: 330, f: [0.5, 0.5], pz: 2.5, p: { ...BASE, power: 0 } }),
  // The GPU comes round to look down on its die, and powers on.
  bootA: { in: 'D', t: [0, 1.4, 0], dir: [0.12, 0.9, 0.42], d: 132, f: [0.5, 0.4], pf: [0.5, 0.4], pz: 2.5, p: { ...BASE, board: 0, sub: 0 },
    win: { power: [0.8, 0.98, 'inOut'], cam: [0.3, 1, 'inOut'] } },
  bootB: { in: 'D', t: [0, 1.4, 0], dir: rotY([0.12, 0.9, 0.42], 0.14), d: 132, f: [0.5, 0.4], pf: [0.5, 0.4], pz: 2.5, p: { ...BASE, board: 0, sub: 0 } },
  // The robot (robot.js), in millimetres around the chip, facing +z. Its parts come on around the GPU as the
  // camera pulls back and the chip rises out of the way; the arms assemble, the camera pulls out to the torso,
  // then the legs; the chip comes down into the open head, which closes on it; the body lights up.
  ...hold('arm', { in: 'D', t: [330, -440, 70], dir: [0.9, 0.14, 0.42], d: 1250, f: [0.5, 0.52], pf: [0.5, 0.45], pz: 2.2, p: { ...ROB, robIn: 1, chipUp: 1, arm: 0 }, pB: { arm: 1 },
    win: { robIn: [0.45, 1, 'out'], chipUp: [0, 0.7] } }, 0.1),
  ...hold('torso', { in: 'D', t: [0, -380, 0], dir: [0.56, 0.2, 0.8], d: 1500, f: [0.5, 0.5], pz: 1.8, p: { ...ROB, robIn: 1, chipUp: 1, arm: 1, torso: 0 }, pB: { torso: 1 } }),
  ...hold('legs', { in: 'D', t: [0, -650, 0], dir: [0.42, 0.14, 0.9], d: 2800, f: [0.5, 0.5], pz: 1.2, p: { ...ROB, robIn: 1, chipUp: 1, arm: 1, torso: 1, legs: 0 }, pB: { legs: 1 } }),
  ...hold('brain', { in: 'D', t: [0, 85, -40], dir: [0.4, 0.42, 0.82], d: 700, f: [0.5, 0.5], pz: 2.1, p: { ...ROB, robIn: 1, chipUp: 1, arm: 1, torso: 1, legs: 1, head: 0 }, pB: { head: 1 } }, 0.1),
  // The light-up fires most of the way out, with the whole body coming into view.
  ...hold('body', { in: 'D', t: [0, -575, 0], dir: [0.3, 0.1, 0.95], d: 2650, f: [0.68, 0.5], pf: [0.5, 0.3], pz: 1.9, p: { ...ROB, robIn: 1, chipUp: 1, arm: 1, torso: 1, legs: 1, head: 1, glow: 1 }, win: { glow: [0.75, 0.8] } }, 0.16),
  // Into the chip in the robot's head, for the memory chart: the head opens first, the camera comes round to
  // look down into it (via), and the robot leaves only at the very end of the move, once the chip fills the
  // view. B drifts on from A without the curve.
  memoryA: { in: 'D', t: [0, 1.0, 0], dir: [0.5, 0.62, 0.6], d: 146, f: [0.26, 0.52], pf: [0.5, 0.23], pz: 2.4, via: [0.1, 0.95, 0.3], late: 0.72,
    p: { ...ROB, arm: 1, torso: 1, legs: 1, head: 1, open: 1 }, win: { open: [0, 0.12] } },
  memoryB: { in: 'D', t: [0, 1.0, 0], dir: rotY([0.5, 0.62, 0.6], 0.12), d: 146, f: [0.26, 0.52], pf: [0.5, 0.23], pz: 2.4, p: { ...ROB, arm: 1, torso: 1, legs: 1, head: 1, open: 1 } },
  // Right after the hero: the transistor beside the name, in the third of the screen it leaves free, never over
  // it or under the bar.
  hello: { in: 'T', t: [0, 0.75, 0], dir: [7.2, 4.0, 7.4], d: 24, f: [0.8, 0.25], pf: [0.5, 0.28], pz: 2.15, lf: [0.82, 0.25], lz: 1, fov: 3.6e-7, p: { tOn: 0, eOn: 1, pace: 0, arr: 0, wires: 0, toC: 0, toD: 0, pkg: 0, board: 0, power: 0, dim: 0.28 } },
};
const PARAMS = ['tOn', 'eOn', 'pace', 'arr', 'wires', 'nand', 'toC', 'toD', 'pkg', 'sub', 'expl', 'board', 'power', 'dim', 'robIn', 'arm', 'torso', 'legs', 'head', 'open', 'chipUp', 'glow'];
const EASE = { lin: (t) => t, in: (t) => t * t * t, out: (t) => 1 - Math.pow(1 - t, 3), inOut: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2) };

const VERT = `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }`;
const FRAG = `
uniform sampler2D tColor; uniform sampler2D tNormal; uniform sampler2D tDepth;
uniform vec2 texel; uniform vec3 ink; uniform vec3 hue[5]; uniform vec3 bg; uniform float inkMix;
uniform float cNear; uniform float cFar; uniform float fogNear; uniform float fogFar; uniform float vignette; uniform vec2 warm; uniform float hueRef[5]; uniform vec3 hueDir[5];
uniform vec3 bgS; uniform vec3 gridInk; uniform vec2 gridA; uniform float viewTop;
uniform sampler2D tGrid; uniform vec4 gridDims; uniform float gridH; uniform float gridDim;
uniform vec4 auraL[5]; uniform vec3 auraC[5]; uniform float auraScreen; uniform vec2 auraCap;
uniform vec3 duoBg; uniform vec3 duoInk; uniform float duoMix;
varying vec2 vUv;
float lin(float d){ return cNear + d * (cFar - cNear); }
vec3 toLin(vec3 c){ return mix(c / 12.92, pow((c + 0.055) / 1.055, vec3(2.4)), step(vec3(0.04045), c)); }
void main(){
  vec4 c = texture2D(tColor, vUv);
  vec3 n0 = texture2D(tNormal, vUv).xyz * 2. - 1.;
  float d0 = lin(texture2D(tDepth, vUv).x);
  float e = 0., dn = d0;
  vec2 o[4]; o[0] = vec2(texel.x, 0.); o[1] = vec2(-texel.x, 0.); o[2] = vec2(0., texel.y); o[3] = vec2(0., -texel.y);
  for (int i = 0; i < 4; i++) {
    vec3 n = texture2D(tNormal, vUv + o[i]).xyz * 2. - 1.;
    float d = lin(texture2D(tDepth, vUv + o[i]).x);
    dn = min(dn, d);
    e = max(e, 1. - smoothstep(0.82, 0.94, dot(n0, n)));
    e = max(e, smoothstep(0.006, 0.02, abs(d - d0) / max(min(d, d0), 1e-6)));
  }
  // Fills tinted in a token hue (their colour, minus grey, points that hue's way) get lines in the hue they
  // point closest to; everything else is inked in the ink colour.
  vec3 chroma = c.rgb - vec3(dot(c.rgb, vec3(0.2126, 0.7152, 0.0722)));
  float best = -1.; vec3 line = ink;
  for (int i = 0; i < 5; i++) { float s = dot(chroma, hueDir[i]) - hueRef[i]; if (s > best) { best = s; line = hue[i]; } }
  vec3 col = mix(c.rgb, mix(ink, line, smoothstep(warm.x, warm.y, best)), e * inkMix);
  // The aura (src/aura.js): the lights the page draws behind everything, here on the stage's ground, mixed
  // as the page mixes them (in sRGB). px: CSS px from the screen's top left (the canvas slides up off the
  // screen as the story ends, by viewTop).
  vec2 px = vec2(gl_FragCoord.x, gridH - gl_FragCoord.y) / gridDims.w + vec2(0., viewTop);
  vec3 s = vec3(0.);
  for (int i = 0; i < 5; i++) { vec2 d = (px - auraL[i].xy) / auraL[i].z; float q = dot(d, d); s += auraC[i] * auraL[i].w * exp(-2.5 * q * q * q); }
  s = min(s, vec3(1.));
  // Its ceiling (aura.js): past the knee, brightness rolls off toward the cap, so it never outshines the content.
  float sy = dot(s, vec3(0.2126, 0.7152, 0.0722)), kw = auraCap.y - auraCap.x;
  if (sy > auraCap.x) s *= (auraCap.x + kw * (1. - exp(-(sy - auraCap.x) / kw))) / sy;
  vec3 groundS = auraScreen > 0.5 ? 1. - (1. - bgS) * (1. - s) : bgS * (1. - s);
  // The page's grain (aura.js): noise around mid grey, overlaid, so it shows in the light, not in the black.
  vec2 gp = floor(gl_FragCoord.xy / gridDims.w); // one grain per CSS px, as the page's tile
  float gn = (fract(sin(dot(gp, vec2(12.9898, 78.233))) * 43758.545) + fract(sin(dot(gp, vec2(39.346, 11.135))) * 24634.634) + fract(sin(dot(gp, vec2(73.156, 52.235))) * 13981.751)) / 3. - 0.5;
  gn *= 80. / 255.;
  groundS = mix(groundS * (1. + 2. * gn), groundS + 2. * gn * (1. - groundS), step(0.5, groundS));
  vec3 ground = toLin(groundS);
  bool empty = dn > cFar * 0.98;
  // The aura is only ever behind: it lights the empty ground, printed text there stays over it, and the
  // parts fade (fog, vignette) into the unlit ground, never into the light.
  if (empty) col = auraScreen > 0.5 ? max(col, ground) : min(col, ground);
  // Fog by depth; nothing drawn there (only printed text, which writes no depth) is left unfogged.
  col = mix(col, bg, (empty ? 0. : smoothstep(fogNear, fogFar, dn)) * 0.92);
  vec2 q = (vUv - 0.5) * vec2(1.0, 0.86);
  col = mix(col, empty ? ground : bg, smoothstep(0.34, 0.92, length(q)) * vignette);
  // The page's drafting grid (src/grid.js) on empty ground: the same cells from the top left, dim at rest and
  // lit where the pointer has just brushed (tGrid: one value per cell; gridDims: columns, rows, cell in CSS px,
  // pixel ratio). A line is as lit as the brighter of the two cells it bounds.
  if (empty) {
    vec2 cell = floor(px / gridDims.z);
    vec2 on = step(mod(px, gridDims.z), vec2(1.));
    if (on.x + on.y > 0.) {
      float here = texture2D(tGrid, (cell + 0.5) / gridDims.xy).r, e = 0.;
      if (on.x > 0.) e = max(here, texture2D(tGrid, (cell + vec2(-0.5, 0.5)) / gridDims.xy).r);
      if (on.y > 0.) e = max(e, max(here, texture2D(tGrid, (cell + vec2(0.5, -0.5)) / gridDims.xy).r));
      bool major = (on.x > 0. && mod(cell.x, ${MAJOR}.) < 0.5) || (on.y > 0. && mod(cell.y, ${MAJOR}.) < 0.5);
      col = toLin(mix(groundS, gridInk, (major ? gridA.y : gridA.x) * (gridDim + (1. - gridDim) * e)));
    }
  }
  // Beta (src/beta.js): the drawing in one template's two colours. Brightness sets each pixel's place between
  // its dark colour (duoBg) and its light one (duoInk), in sRGB as the page mixes: on the dark theme the ground
  // is the dark one and lines go to ink; on paper the ink is the dark one and the paper goes to the ground.
  if (duoMix > 0.) {
    float ls = pow(max(dot(col, vec3(0.2126, 0.7152, 0.0722)), 0.), 1. / 2.2);
    col = mix(col, toLin(mix(duoBg, duoInk, smoothstep(0.06, 0.8, ls))), duoMix);
  }
  gl_FragColor = vec4(col, 1.);
  #include <colorspace_fragment>
}`;

export function createStage(canvas, { reducedMotion = false, theme = 'dark' } = {}) {
  // No depth buffer on the screen: only the edge quad and the streaks are drawn there, neither depth-tested.
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, depth: false, powerPreference: 'high-performance' });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.debug.checkShaderErrors = import.meta.env.DEV; // the check waits on the GPU for every new shader
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.01, 1000);
  const models = buildModels();
  const { T, L, C, D } = models;
  const sizeOf = (box, g) => { g.updateWorldMatrix(true, false); return box.getSize(new THREE.Vector3()).x * new THREE.Vector3().setFromMatrixScale(g.matrixWorld).x; };
  let lSize = 1, cSize = 1; // world widths of the logic array and the SM, set once they are nested

  // Nest the acts: T in L in C (at the patch, on its base) in D (at the chosen SM tile, on the die).
  L.group.add(T.group);
  L.group.scale.setScalar(S_CORE);
  L.group.position.set(PATCH[0], 0, PATCH[1]);
  C.group.add(L.group);
  C.group.scale.setScalar(S_DIE);
  C.group.position.set(D.tile.x, D.DIE_H + 0.6 * S_DIE, D.tile.z);
  D.dieG.add(C.group);
  D.dieG.position.y = D.INT_H; // rest position, so the camera keys are baked against the assembled package
  scene.add(D.group);
  lSize = sizeOf(L.box, L.group); cSize = sizeOf(C.box, C.group);
  // The package lifts as one (the chip on its way into the robot's head); keys are baked with it at rest.
  const pkg = new THREE.Group();
  D.group.add(pkg);
  for (const o of [D.dieG, D.interposer, D.hbm, D.hbmSolid, D.memCells, D.hbmGlow]) pkg.add(o);
  const R = buildRobot();
  D.group.add(R.group);

  // Electrons in the transistor; data leaving the memory stacks during inference.
  const electrons = new Streaks(48, { trail: 18, size: 0.07, spacing: 0.016 });
  T.group.add(electrons.mesh);
  const packets = new Streaks(96, { trail: 14, size: 0.32, spacing: 0.022 });
  pkg.add(packets.mesh);
  // Off-screen targets for the edge pass.
  // sRGB storage: in 8-bit linear, near-black fills round unevenly per channel and turn olive.
  const colorRT = new THREE.WebGLRenderTarget(1, 1, { samples: 4 });
  colorRT.texture.colorSpace = THREE.SRGBColorSpace;
  const normalRT = new THREE.WebGLRenderTarget(1, 1);
  normalRT.depthTexture = new THREE.DepthTexture(1, 1);
  const normalMat = new THREE.MeshNormalMaterial();
  const U = {
    tColor: { value: colorRT.texture }, tNormal: { value: normalRT.texture }, tDepth: { value: normalRT.depthTexture }, texel: { value: new THREE.Vector2() },
    ink: { value: new THREE.Color() }, hue: { value: [0, 1, 2, 3, 4].map(() => new THREE.Color()) }, bg: { value: new THREE.Color() }, inkMix: { value: 0.85 },
    cNear: { value: 0.1 }, cFar: { value: 100 }, fogNear: { value: 1 }, fogFar: { value: 2 }, vignette: { value: 0.5 }, warm: { value: new THREE.Vector2() }, hueRef: { value: [0, 0, 0, 0, 0] },
    hueDir: { value: [0, 1, 2, 3, 4].map(() => new THREE.Vector3(1, 0, 0)) },
    tGrid: { value: null }, gridDims: { value: new THREE.Vector4(1, 1, CELL, 1) }, gridH: { value: 1 }, gridDim: { value: DIM },
    bgS: { value: new THREE.Vector3() }, gridInk: { value: new THREE.Vector3() }, gridA: { value: new THREE.Vector2() }, viewTop: { value: 0 },
    auraL: { value: Array.from({ length: 5 }, () => new THREE.Vector4(0, 0, 1, 0)) }, auraC: { value: Array.from({ length: 5 }, () => new THREE.Vector3()) }, auraScreen: { value: 1 }, auraCap: { value: new THREE.Vector2(1, 2) },
    duoBg: { value: new THREE.Vector3() }, duoInk: { value: new THREE.Vector3() }, duoMix: { value: 0 },
  };
  const quadMat = new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader: FRAG, uniforms: U, depthTest: false, depthWrite: false });
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), quadMat);
  quad.frustumCulled = false;
  const quadScene = new THREE.Scene();
  quadScene.add(quad);
  const quadCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

  let P = PALETTES[theme] ?? PALETTES.dark;
  const textures = [];
  // The token hues as lines and light (hueCol) and as soft fills (fillCol), for the current theme.
  const hueCol = U.hue.value, fillCol = [0, 1, 2, 3, 4].map(() => new THREE.Color());

  function applyTheme(name) {
    P = PALETTES[name] ?? PALETTES.dark;
    textures.splice(0).forEach((t) => t.dispose());
    scene.background = new THREE.Color(P.bg);
    U.ink.value.set(P.ink); U.bg.value.set(P.bg);
    // The ground and the grid's ink in sRGB: the shader lights and lines them as the page does.
    const g = new THREE.Color(P.grid[0]).getRGB({}, THREE.SRGBColorSpace), b0 = new THREE.Color(P.bg).getRGB({}, THREE.SRGBColorSpace);
    U.bgS.value.set(b0.r, b0.g, b0.b); U.gridInk.value.set(g.r, g.g, g.b); U.gridA.value.set(P.grid[1], P.grid[2]);
    U.inkMix.value = P.inkMix; U.vignette.value = P.vignette; U.warm.value.set(...P.warm);
    // Each fill's hue, as a direction away from grey; the page's own tint is the zero point.
    const chromaOf = (c) => { const l = 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b; return new THREE.Vector3(c.r - l, c.g - l, c.b - l); };
    P.hues.forEach((h, i) => {
      hueCol[i].set(h); fillCol[i].set(P.fills[i]);
      U.hueDir.value[i].copy(chromaOf(fillCol[i])).normalize();
      U.hueRef.value[i] = chromaOf(U.bg.value).dot(U.hueDir.value[i]);
    });
    const mat = (role) => {
      const t = TONE[role];
      return new THREE.MeshBasicMaterial({ color: t === 'a' ? '#ffffff' : P.tones[t ?? 1], toneMapped: false });
    };
    const assign = (m) => {
      m.material?.dispose?.(); m.material = mat(m.role);
      if (TONE[m.role] === 'a') { m.items.forEach((_, i) => m.setColorAt(i, fillCol[i % 5])); m.instanceColor.needsUpdate = true; }
    };
    for (const g of [T.parts, L.m, C.m, D.bm]) Object.values(g).forEach(assign);
    assign(D.substrate); assign(D.smd); assign(D.hbm); assign(D.hbmSolid);
    // Pulses add light on the dark page and multiply a tint into the light one. The added-light gains stay
    // low enough that a hue never sums to white.
    const pulse = () => new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, depthWrite: false, toneMapped: false, blending: P.fx === 'add' ? THREE.AdditiveBlending : THREE.MultiplyBlending, premultipliedAlpha: P.fx !== 'add' });
    D.overlay.material = pulse();
    D.hbmGlow.material = pulse();
    D.memCells.material = pulse();
    electrons.setTheme(P.hues, P.fx);
    packets.setTheme(P.hues, P.fx);
    R.setTheme(P, hueCol, fillCol);
    const dt = dieTexture({ ...P.die, tc: P.fills });
    const side = new THREE.MeshBasicMaterial({ color: P.tones[2], toneMapped: false });
    D.dieMesh.material = [side, side, new THREE.MeshBasicMaterial({ map: dt, toneMapped: false }), side, side, side];
    const it = dotsTexture(P.tones[1], P.dots, 60, 0.12);
    D.interposer.material = [side, side, new THREE.MeshBasicMaterial({ map: it, toneMapped: false }), side, side, side];
    const pt = tracesTexture(P.tones[0], P.traces, 0.22);
    D.pcb.material = [side, side, new THREE.MeshBasicMaterial({ map: pt, toneMapped: false }), side, side, side];
    textures.push(dt, it, pt);
    lastNand = -1; lastMem = '';
  }

  // Instance tint for a flat material: the colour the instance should show, divided by the material's.
  const _tint = new THREE.Color();
  const tint = (mesh, i, target, k) => {
    const mc = mesh.material.color;
    _tint.setRGB(1, 1, 1);
    if (target && k > 0) _tint.lerp(new THREE.Color(target.r / (mc.r + 1e-3), target.g / (mc.g + 1e-3), target.b / (mc.b + 1e-3)), k);
    mesh.setColorAt(i, _tint);
  };
  // The NAND four stand out when `nand` rises, in consecutive token hues: our transistor's gate is c0, the
  // three cells around it c1..c3.
  let lastNand = -1, nk = 0;
  const nandFill = L.cells.map((c) => (c.nand ? fillCol[++nk] : null));
  function setCellColors(n) {
    if (Math.abs(n - lastNand) < 0.01) return;
    lastNand = n;
    for (const key of ['fins', 'gates', 'contacts']) {
      const m = L.m[key];
      m.items.forEach((b, i) => tint(m, i, nandFill[b.cell], n));
      m.instanceColor.needsUpdate = true;
    }
    // Our transistor's gate is c0 while on; its fins and contacts join it, so all four cells read alike.
    for (const m of [T.parts.fins, T.parts.contacts]) { m.items.forEach((_, i) => tint(m, i, fillCol[0], n)); m.instanceColor.needsUpdate = true; }
  }
  // The memory gauge: 40 DRAM dies of 2 GiB each, as cells on the five live lids, filling die by die
  // across the stacks (memory is interleaved over all of them). Weights burn solid; KV cache glows dimmer.
  // Each stack keeps its own hue (c0..c4), the same as its lid's glow.
  let lastMem = '';
  function setMemory(fill, weights) {
    const key = `${fill.toFixed(3)}|${weights.toFixed(3)}|${P.fx}`;
    if (key === lastMem) return;
    lastMem = key;
    const n = D.live.length;
    D.memCells.cells.forEach((c, i) => {
      // The charts give shares of the 85.03 GB CUDA sees; each die holds 2 GiB (2.147 GB).
      const k = c.die * n + c.stack, dies = (fill * 85.03) / 2.147, part = Math.min(1, Math.max(0, dies - k));
      const v = part * (k < (weights * 85.03) / 2.147 ? 1 : 0.45);
      if (P.fx === 'add') col.copy(hueCol[c.stack % 5]).multiplyScalar(v * 0.42);
      else col.copy(white).lerp(fillCol[c.stack % 5], Math.min(1, v * 1.4));
      D.memCells.setColorAt(i, col);
    });
    D.memCells.instanceColor.needsUpdate = true;
    D.memCells.visible = fill > 0.001;
  }

  // --- layout ---
  let W = 1, H = 1, dpr = 1, phone = false, land = false, bands = {}, quality = 1, slow = 0;
  function resize() {
    const r = canvas.getBoundingClientRect();
    W = Math.max(1, Math.round(r.width)); H = Math.max(1, Math.round(r.height));
    phone = matchMedia(PHONE_Q).matches; // stacked layout: subject above, panel below
    land = phone && W > H;
    // Never below 1.5x, so ordinary screens get supersampled line art, and up to the screen's own density
    // (2x, 2.5x on phones) so dense screens are drawn natively, not stretched. A slow machine steps down.
    dpr = Math.min(Math.max(window.devicePixelRatio || 1, 1.5), phone ? 2.5 : 2) * quality;
    renderer.setPixelRatio(dpr);
    renderer.setSize(W, H, false);
    const bw = Math.round(W * dpr), bh = Math.round(H * dpr);
    colorRT.setSize(bw, bh);
    normalRT.setSize(bw, bh);
    U.texel.value.set(Math.max(1, dpr * 0.8) / bw, Math.max(1, dpr * 0.8) / bh);
    const bar = document.querySelector('.bar')?.getBoundingClientRect();
    barBottom = bar ? bar.bottom : 64;
    U.gridH.value = bh; U.gridDims.value.w = dpr;
  }

  // --- the camera rig, from keyframes ---
  const tmpA = new THREE.Vector3(), tmpD = new THREE.Vector3();
  const spaces = { T: T.group, L: L.group, C: C.group, D: D.group };
  const worldScale = (k) => { spaces[k].updateWorldMatrix(true, false); return new THREE.Vector3().setFromMatrixScale(spaces[k].matrixWorld).x; };
  function keyWorld(id) {
    const k = KEYS[id];
    const s = worldScale(k.in);
    const t = spaces[k.in].localToWorld(new THREE.Vector3(...k.t));
    // lf, lz: where and how far out a phone on its side frames the key, when its card leaves a side free.
    // fs: where the target sits on a short desktop screen (under 820 px), when it has to make room.
    return { id, t, dir: new THREE.Vector3(...k.dir).normalize(), d: k.d * s, f: k.f, fs: k.fs, pf: k.pf ?? [0.5, 0.42], pz: k.pz ?? 1.8, lf: k.lf, lz: k.lz };
  }
  let order = ['hero', 'hello'];
  let worldKeys = [];
  function bakeKeys() { const y = pkg.position.y; pkg.position.y = 0; D.group.updateMatrixWorld(true); worldKeys = order.map(keyWorld); pkg.position.y = y; }
  const S = { k: 0, mx: 0, my: 0, yaw: 0, hover: 0, prefill: 0, util: 0, hbm: 0, flow: 0, packet: 1, memFill: 0, memWeights: 0 };
  const params = Object.fromEntries(PARAMS.map((p) => [p, 0]));
  let fovMeters = 1e-7, camDist = 1, frame = [0.5, 0.5];
  const sm = (t) => t * t * (3 - 2 * t);

  function rig(time) {
    const n = worldKeys.length - 1;
    // Reduced motion steps to the next key halfway through that key's camera window (halfway, without one).
    const cut = (x) => { const j = Math.min(n - 1, Math.max(0, Math.floor(x))), w = KEYS[worldKeys[j + 1].id].win?.cam; return j + (x - j >= (w ? (w[0] + w[1]) / 2 : 0.5) ? 1 : 0); };
    const kk = reducedMotion ? cut(S.k) : Math.min(n, Math.max(0, S.k));
    const i = Math.min(n - 1, Math.floor(kk)), f0 = kk - i;
    const a = worldKeys[i], b = worldKeys[i + 1];
    const kA = KEYS[a.id], kB = KEYS[b.id];
    // A key can time parts of the move into it: win.name = [from, to, ease] within the segment.
    const win = (name, dflt) => { const w = kB.win?.[name]; return w ? EASE[w[2] ?? 'inOut'](Math.min(1, Math.max(0, (f0 - w[0]) / (w[1] - w[0])))) : dflt; };
    const f = win('cam', f0);
    // Phone zooms were set for a 390 x 844 screen; wider portrait screens (tablets) need less pull-back,
    // and a phone on its side, with a third of the height to give the subject, needs a little more.
    const shape = phone ? (land ? 1.15 : Math.min(1, Math.max(0.5, 0.46 / (W / H)))) : 1;
    const zOf = (k) => (phone ? Math.max(1, land && k.lz ? k.lz : k.pz * shape) : 1);
    const zA = zOf(a), zB = zOf(b);
    const la = Math.log(a.d * zA), lb = Math.log(b.d * zB);
    camDist = Math.exp(la + (lb - la) * f);
    // Move the target in step with the linear distance, so a zoom keeps its subject in frame.
    const dA = a.d * zA, dB = b.d * zB;
    const g = Math.abs(dB - dA) > 1e-12 ? (camDist - dA) / (dB - dA) : f;
    tmpA.copy(a.t).lerp(b.t, Math.min(1, Math.max(0, g)));
    // `via`: a direction the move passes through on its way (a quadratic curve), so a dive can look down.
    const t = sm(f);
    if (kB.via) tmpD.copy(a.dir).multiplyScalar((1 - t) * (1 - t)).addScaledVector(_via.set(...kB.via).normalize(), 2 * (1 - t) * t).addScaledVector(b.dir, t * t).normalize();
    else tmpD.copy(a.dir).lerp(b.dir, t).normalize();
    // A slow drift and the pointer give the stage some life.
    const drift = reducedMotion ? 0 : Math.sin(time * 0.00011) * 0.06;
    tmpD.applyAxisAngle(THREE.Object3D.DEFAULT_UP, drift + S.mx * 0.1 + S.yaw);
    tmpD.y = Math.min(0.98, Math.max(0.15, tmpD.y - S.my * 0.05));
    tmpD.normalize();
    camera.position.copy(tmpA).addScaledVector(tmpD, camDist);
    camera.up.set(0, 1, 0);
    camera.lookAt(tmpA);
    // On a phone on its side the subject sits in the middle of the space between the bar and its card.
    const fy = (k) => { const top = land ? bands[k.id.replace(/[AB]$/, '')] : null; return top != null ? (barBottom + top) / 2 / H : k.pf[1]; };
    const fOf = (k) => (!phone ? (k.fs && H < 820 ? k.fs : k.f) : land && k.lf ? k.lf : [k.pf[0], fy(k)]);
    const fa = fOf(a), fb = fOf(b);
    frame = [fa[0] + (fb[0] - fa[0]) * sm(f), fa[1] + (fb[1] - fa[1]) * sm(f)];
    stageAura(a.id, b.id, t, frame[0], frame[1]); // the light moves with the subject, in each beat's colours
    const late = kB.late ? sm(Math.min(1, Math.max(0, (f0 - kB.late) / (1 - kB.late)))) : sm(f0);
    for (const p of PARAMS) params[p] = (kA.p[p] ?? 0) + ((kB.p[p] ?? 0) - (kA.p[p] ?? 0)) * win(p, late);
    // Field of view in metres for the scale bar: interpolate the keys' widths in log space.
    const wA = viewMeters(a, zA), wB = viewMeters(b, zB);
    fovMeters = Math.exp(Math.log(wA) + (Math.log(wB) - Math.log(wA)) * f);
    return tmpA;
  }
  // The drawing is schematic below the die, so those keys carry the real width; from the die up it is measured.
  const viewMeters = (w, z) => {
    const k = KEYS[w.id];
    return (k.fov ?? 2 * k.d * Math.tan((34 * Math.PI) / 360) * (W / H) * 1e-3) * z * (k.fov ? (W / H) / 1.6 : 1);
  };

  function frameCamera() {
    // The view window slides opposite to where the target should land on screen.
    const ox = (0.5 - frame[0]) * W, oy = (0.5 - frame[1]) * H;
    const hh = camDist * Math.tan((34 * Math.PI) / 360);
    camera.left = -hh * (W / H); camera.right = hh * (W / H); camera.top = hh; camera.bottom = -hh;
    camera.near = camDist / 300; camera.far = camDist * 30;
    camera.setViewOffset(W, H, ox, oy, W, H);
    camera.updateProjectionMatrix();
    U.fogNear.value = camDist * 1.0; U.fogFar.value = camDist * 2.1;
  }

  // --- per-frame model state ---
  const smE = new Float32Array(D.overlay.count);
  const smRank = Float32Array.from({ length: D.overlay.count }, (_, i) => ((i * 0.618034) % 1));
  const hbmE = new Float32Array(D.live.length);
  const col = new THREE.Color(), white = new THREE.Color(1, 1, 1);
  let lastPrefill = 0, pulseOn = 0, pulseUntil = 0, nextPulse = 0, flowAcc = 0;
  const v1 = new THREE.Vector3(), v2 = new THREE.Vector3();
  const rnd = (a, b) => a + Math.random() * (b - a);
  function electron(now, dur = rnd(140, 320)) {
    // All in one fin's plane: straight down the source contact into the fin, along it under the gate,
    // straight up the drain contact (contacts at x = ±2.05, their tops at y = 2.52; the fin's top is 1.3).
    const fz = FINS[(Math.random() * FINS.length) | 0] + rnd(-0.05, 0.05), y = rnd(0.95, 1.15);
    const pts = [new THREE.Vector3(-2.05, 2.45, fz), new THREE.Vector3(-2.05, y, fz), new THREE.Vector3(2.05, y, fz), new THREE.Vector3(2.05, 2.45, fz)];
    electrons.spawn(pts, now, dur);
  }
  function packet(now, s, gain = 1) {
    const [x, z] = D.stacks[D.live[s]];
    const sx = Math.sign(x), j = rnd(-3.6, 3.6), y = D.INT_H + 0.95;
    packets.size = 0.32 * S.packet;
    packets.spawn([v1.set(x + sx * 2.5, y, z + j), v2.set(sx * (D.DIE_MM / 2 - 4.5), y, z * 0.55 + j * 0.6)], now, rnd(340, 460), gain);
  }
  function animateModels(time, dt) {
    const p = params;
    // The switch. In the hero it flips on in short random bursts; at the transistor beat it keeps a slow
    // rhythm; a pointer on the gate holds it on. Electrons only cross while it is on.
    const flicker = p.eOn > 0.5 && !reducedMotion;
    if (flicker && time > nextPulse) {
      const slow = p.pace > 0.5;
      // Irregular on purpose: uneven counts (mostly few), random gaps between electrons, mixed speeds.
      const n = slow ? 6 + ((Math.random() * 10) | 0) : 1 + ((Math.random() ** 1.6 * 8) | 0);
      let at = 0, end = 0;
      for (let b = 0; b < n; b++) {
        const dur = rnd(140, 320), t0 = at;
        end = Math.max(end, t0 + dur);
        setTimeout(() => electron(performance.now(), dur), t0);
        at += 6 - Math.log(1 - Math.random()) * (slow ? 55 : 40);
      }
      // The gate stays on until the last electron has crossed.
      pulseUntil = time + end + 20;
      nextPulse = pulseUntil + (slow ? rnd(380, 1100) : rnd(220, 1400));
    }
    pulseOn = flicker && time < pulseUntil ? 1 : 0;
    const on = Math.max(p.tOn, pulseOn, S.hover);
    current.on = p.eOn > 0.5 ? on : 0; // the aura breathes with the current
    if (S.hover > 0.5 && p.eOn > 0.5 && !reducedMotion && Math.random() < dt / 33) electron(time);
    T.parts.gate.material.color.set(on > 0.5 ? P.fills[0] : P.tones[3]);
    electrons.mesh.visible = p.eOn > 0.02;
    electrons.update(time, camera);
    // The array grows out from our transistor; wiring drops in from above.
    // Seen from far off, the SM and the logic array inside it are a few pixels of noise: their blocks sink.
    const vh = 2 * camDist * Math.tan((34 * Math.PI) / 360);
    const lFar = sm(Math.min(1, Math.max(0, ((lSize / vh) * H - 14) / 26)));
    const cFar = sm(Math.min(1, Math.max(0, ((cSize / vh) * H - 18) / 30)));
    const showL = (p.arr > 0.002 || p.wires > 0.002) && lFar > 0.001;
    for (const k of Object.keys(L.m)) L.m[k].visible = showL;
    for (const k of ['fins', 'gates', 'contacts']) L.m[k].setRise(p.arr * lFar, { spread: 1 });
    const g = Math.max(0.07, Math.min(1, p.arr * 1.25)); // at rest it hides inside the transistor's own substrate
    L.m.slab.scale.set(g, 1, g * 1.04); L.m.oxide.scale.set(g, 1, g * 1.04);
    L.m.m1.setRise(p.wires * lFar, { spread: 0.6, lift: 8 });
    L.m.m2.setRise(Math.max(0, p.wires * lFar * 1.15 - 0.15), { spread: 0.6, lift: 10 });
    setCellColors(p.nand);
    // The multiprocessor rises around the array; the die appears under it.
    const showC = p.toC > 0.001;
    C.m.base.visible = showC;
    for (const k of ['tc', 'rf', 'alu', 'l1', 'ctl']) { C.m[k].visible = showC && cFar > 0.001; C.m[k].setRise(p.toC * cFar, { spread: 0.8 }); }
    const showD = p.toD > 0.001;
    D.dieMesh.visible = showD;
    D.dieMesh.scale.y = Math.max(0.001, p.toD);
    D.overlay.visible = showD && p.power > 0.001;
    // Package parts fly in, then the exploded stack closes up.
    const x = p.expl, k = p.pkg;
    D.interposer.visible = D.substrate.visible = D.smd.visible = k > 0.001;
    D.hbm.visible = k > 0.001 && x > 0.12;
    D.hbmSolid.visible = k > 0.001 && x <= 0.12;
    const fly = (1 - k) * 60;
    D.hbmSolid.items.forEach((b) => { b.y = D.INT_H + fly * 0.8; });
    D.hbmSolid.setRise(1, { spread: 0, lift: 0.0001 });
    // After the board beat the substrate drops away too, leaving the die and its memory on their own.
    const drop = (1 - p.sub) * 30;
    D.substrate.position.y = -fly * 1.3 - drop;
    D.smd.position.y = -fly * 1.3 - drop;
    D.substrate.visible = D.smd.visible = k > 0.001 && p.sub > 0.001;
    D.interposer.position.y = x * 7 - fly;
    D.dieG.position.y = D.INT_H + x * 15;
    D.hbm.items.forEach((b) => { let y = D.INT_H + x * 12 + fly * 0.8; for (let l = 0; l < b.l; l++) y += D.hbm.layerH[l] + x * 0.9; b.y = y; });
    D.hbm.setRise(k > 0.001 ? 1 : 0, { spread: 0, lift: 0.0001 });
    D.smd.setRise(Math.min(k, p.sub), { spread: 0.9 });
    // The board rises from below, its parts popping on.
    D.board.visible = p.board > 0.001;
    D.board.position.y = -(1 - p.board) * 40;
    for (const kk of ['stages', 'inductors', 'caps']) D.bm[kk].setRise(p.board, { spread: 0.9 });
    D.bm.conns.setRise(p.board, { spread: 0 });
    // Streaming multiprocessors: a flash on prefill, a steady level the memory chart sets.
    if (D.overlay.visible) {
      // Under reduced motion the die keeps its steady level: no flash or packets.
      if (S.prefill !== lastPrefill) { if (!reducedMotion) smE.fill(1); lastPrefill = S.prefill; }
      const cs = D.overlay.smCenters;
      for (let i = 0; i < smE.length; i++) {
        const [cx, cz] = cs[i];
        const wave = reducedMotion ? 0.5 : 0.5 + 0.5 * Math.sin(time * 0.0016 - (cx + cz) * 0.22);
        const level = Math.max(S.util * (0.75 + 0.25 * smRank[i]), wave * 0.14 * (1 - S.util));
        smE[i] = Math.max(smE[i] * Math.pow(0.03, dt / 1000), level * p.power);
        const v = smE[i] * p.power;
        if (P.fx === 'add') col.copy(hueCol[i % 5]).multiplyScalar(v * 0.48);
        else col.copy(white).lerp(fillCol[i % 5], Math.min(1, v * 1.1));
        D.overlay.setColorAt(i, col);
      }
      D.overlay.instanceColor.needsUpdate = true;
    }
    // Memory traffic: each stack's lid glows with reads; the memory chart keeps a steady stream going.
    D.hbmGlow.visible = k > 0.5 && p.power > 0.001;
    if (D.hbmGlow.visible) {
      if (S.flow > 0 && !reducedMotion) { flowAcc += (S.flow * dt) / 1000; while (flowAcc > 1) { packet(time, (Math.random() * D.live.length) | 0, 0.8); flowAcc -= 1; } }
      D.live.forEach((s, i) => {
        hbmE[i] = Math.max(hbmE[i] * Math.pow(0.004, dt / 1000), S.hbm);
        const [hx, hz] = D.stacks[s];
        const top = D.hbm.items[s * 10 + 9];
        _m.compose(_p.set(hx, top.y + top.h + 0.004, hz), _q0, _s.set(1, 1, 1));
        D.hbmGlow.setMatrixAt(i, _m);
        const v = hbmE[i] * p.power;
        if (P.fx === 'add') col.copy(hueCol[i % 5]).multiplyScalar(v * 0.18);
        else col.copy(white).lerp(fillCol[i % 5], Math.min(1, v * 0.7));
        D.hbmGlow.setColorAt(i, col);
      });
      D.hbmGlow.instanceMatrix.needsUpdate = true;
      D.hbmGlow.instanceColor.needsUpdate = true;
    }
    setMemory(D.hbmSolid.visible ? S.memFill * p.power : 0, S.memWeights * p.power);
    packets.mesh.visible = k > 0.5;
    packets.update(time, camera);
    // The robot; the chip waits above its head, then goes in, and the die flashes as the head closes.
    const r = R.update(p, time, reducedMotion);
    pkg.position.y = r.lift;
    if (r.boot) { smE.fill(1); sweepAura(time); }
  }

  // --- callouts ---
  const labels = L.labels;
  const subjects = { logic: [L.group, L.box] };
  let tagEls = [], tagsRoot = null, leaders = null, scalebar = null, barBottom = 64;
  let callBeat = null, assign = null, panelRect = null, shown = [], lastSvg = '', lastBar = '';
  function mountOverlays(root, svg, bar) {
    tagsRoot = root; leaders = svg; scalebar = bar;
    tagsRoot.innerHTML = '';
    tagEls = labels.map((l) => { const el = document.createElement('span'); el.className = 'tag'; el.textContent = l.text; tagsRoot.append(el); return el; });
    shown = labels.map(() => ({ x: 0, y: 0, on: false }));
  }
  const v3 = new THREE.Vector3(), corner = new THREE.Vector3();
  function project(obj, x, y, z) {
    v3.set(x, y, z);
    obj.localToWorld(v3);
    v3.project(camera);
    return [(v3.x + 1) / 2 * W, (1 - v3.y) / 2 * H, v3.z];
  }
  function placeLabels() {
    if (!tagsRoot) return;
    const active = callBeat && subjects[callBeat] ? callBeat : null;
    const idx = [], items = [];
    if (active) {
      labels.forEach((l, i) => {
        if (!l.beats.includes(active) || (phone && !(l.phone ?? l.prio))) return;
        const [ax, ay, az] = project(l.obj, ...l.at);
        if (az > 1 || ax < 0 || ax > W || ay < 0 || ay > H) return;
        idx.push(i);
        items.push({ ax, ay, w: tagEls[i].offsetWidth, h: tagEls[i].offsetHeight, prio: l.prio ?? 0 });
      });
    }
    let placed = [];
    if (items.length) {
      // The subject's box on screen, from its eight corners.
      const [obj, box] = subjects[active];
      let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
      for (let c = 0; c < 8; c++) {
        const [sx, sy] = project(obj, c & 1 ? box.max.x : box.min.x, c & 2 ? box.max.y : box.min.y, c & 4 ? box.max.z : box.min.z);
        x0 = Math.min(x0, sx); y0 = Math.min(y0, sy); x1 = Math.max(x1, sx); y1 = Math.max(y1, sy);
      }
      const m = phone ? 14 : 28;
      const safe = { x0: m, y0: barBottom + 14, x1: W - m, y1: H - (phone ? 12 : 72) };
      if (panelRect) {
        if (phone) safe.y1 = Math.min(safe.y1, panelRect.top - 14);
        else if (panelRect.left > W / 2) safe.x1 = Math.min(safe.x1, panelRect.left - 32);
        else safe.x0 = Math.max(safe.x0, panelRect.right + 32);
      }
      const r = layoutCallouts(items, { x0, y0, x1, y1 }, safe, { gap: phone ? 22 : 36, assign: assign?.beat === active && assign.n === items.length ? assign.lanes : null });
      if (!assign || assign.beat !== active || assign.n !== items.length) assign = { beat: active, n: items.length, lanes: r.assign };
      placed = r.placed;
    }
    let svg = '';
    labels.forEach((l, i) => {
      const k = idx.indexOf(i), o = k >= 0 ? placed[k] : null, st = shown[i], el = tagEls[i];
      if (!o) { if (st.on) { st.on = false; el.classList.remove('on'); } return; }
      // Ease toward the target so the drifting camera never makes a label jump.
      if (!st.on) { st.x = o.x; st.y = o.y; st.on = true; el.classList.add('on'); }
      st.x += (o.x - st.x) * 0.35; st.y += (o.y - st.y) * 0.35;
      el.style.transform = `translate(${st.x.toFixed(1)}px, ${st.y.toFixed(1)}px)`;
      const dx = st.x - o.x, dy = st.y - o.y;
      const pts = o.path.map(([px, py], n) => (n === 0 ? [px, py] : [px + dx, py + dy]));
      svg += `<path class="ld" d="M${pts.map((q) => q.map((v) => v.toFixed(1)).join(' ')).join(' L')}"/><circle class="dot" cx="${pts[0][0].toFixed(1)}" cy="${pts[0][1].toFixed(1)}" r="3"/>`;
    });
    if (leaders && svg !== lastSvg) leaders.innerHTML = lastSvg = svg;
  }
  function placeScalebar() {
    if (!scalebar) return;
    const metersPerPx = fovMeters / W;
    const target = (phone ? 64 : 104) * metersPerPx;
    const p10 = Math.pow(10, Math.floor(Math.log10(target)));
    const nice = [1, 2, 5, 10].map((m) => m * p10).reduce((a, b) => (Math.abs(b - target) < Math.abs(a - target) ? b : a));
    const len = `${Math.round(nice / metersPerPx)}px`, a = si(nice), b = `Field of view ${si(fovMeters, true)}`;
    if (len + a + b === lastBar) return;
    lastBar = len + a + b;
    scalebar.style.setProperty('--sb', len);
    scalebar.querySelector('.sb-len').textContent = a;
    scalebar.querySelector('.sb-fov').textContent = b;
  }

  // --- the drafting grid's brush map (src/grid.js), handed to the edge pass as a texture ---
  let gridTex = null, gridData = new Uint8Array(1), gridSeen = -1;
  function syncGrid() {
    if (brush.version === gridSeen) return;
    gridSeen = brush.version;
    if (gridTex?.image.width !== brush.cols || gridTex?.image.height !== brush.rows) {
      gridTex?.dispose();
      gridData = new Uint8Array(brush.cols * brush.rows);
      gridTex = new THREE.DataTexture(gridData, brush.cols, brush.rows, THREE.RedFormat, THREE.UnsignedByteType);
      U.tGrid.value = gridTex;
      U.gridDims.value.set(brush.cols, brush.rows, CELL, dpr);
    }
    for (let i = 0; i < gridData.length; i++) gridData[i] = brush.v[i] * 255;
    gridTex.needsUpdate = true;
  }

  // --- the aura's lights (src/aura.js), as the page draws them ---
  function syncAura(now) {
    const o = auraAt(now);
    U.auraL.value.forEach((v, i) => v.fromArray(o.L, i * 4));
    U.auraC.value.forEach((v, i) => v.fromArray(o.C, i * 3));
    U.auraScreen.value = o.screen ? 1 : 0;
    U.auraCap.value.fromArray(o.cap);
    U.viewTop.value = canvas.getBoundingClientRect().top;
  }

  // --- pointer: parallax and a hand on the switch ---
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  let pointer = null;
  function onPointer(e) {
    const r = canvas.getBoundingClientRect();
    pointer = { x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height };
  }
  function hoverGate() {
    if (!pointer || params.eOn < 0.5) { S.hover += (0 - S.hover) * 0.1; canvas.style.cursor = turn.drag ? 'grabbing' : 'grab'; return; }
    ndc.set(pointer.x * 2 - 1, -(pointer.y * 2 - 1));
    ray.setFromCamera(ndc, camera);
    const hit = ray.intersectObjects([T.parts.gate, T.parts.contacts, T.parts.spacers], false).length > 0;
    S.hover += ((hit ? 1 : 0) - S.hover) * 0.15;
    canvas.style.cursor = turn.drag ? 'grabbing' : hit ? 'pointer' : 'grab';
  }

  // --- a drag turns the subject about the vertical; three seconds after letting go it eases back ---
  const turn = { drag: null, from: 0, at: 0 };
  canvas.style.touchAction = 'pan-y'; // a finger still scrolls the page up and down; sideways, it turns
  canvas.addEventListener('pointerdown', (e) => {
    if (e.button) return;
    turn.drag = { x: e.clientX, id: e.pointerId };
    canvas.setPointerCapture?.(e.pointerId);
  });
  canvas.addEventListener('pointermove', (e) => {
    if (turn.drag?.id !== e.pointerId) return;
    S.yaw -= (e.clientX - turn.drag.x) * 0.008; // the side facing you follows the pointer
    turn.drag.x = e.clientX;
  });
  const release = (e) => {
    if (turn.drag?.id !== e.pointerId) return;
    turn.drag = null;
    S.yaw = Math.atan2(Math.sin(S.yaw), Math.cos(S.yaw)); // back the short way round
    turn.from = S.yaw; turn.at = performance.now() + 3000;
  };
  canvas.addEventListener('pointerup', release);
  canvas.addEventListener('pointercancel', release);
  function settleTurn(now) {
    if (turn.drag || !S.yaw || now < turn.at) return;
    const t = Math.min(1, (now - turn.at) / 1100);
    S.yaw = reducedMotion || t >= 1 ? 0 : turn.from * Math.pow(1 - t, 3); // ease-out cubic
  }

  // --- loop ---
  let running = false, raf = 0, last = performance.now();
  function render(now) {
    const dt = Math.min(64, now - last); last = now;
    // Frames running long for two seconds: draw at a lower resolution (down to 60%).
    slow = dt > 26 ? slow + dt : Math.max(0, slow - dt * 0.5);
    if (slow > 2000 && quality > 0.61) { quality -= 0.2; slow = 0; resize(); }
    if (pointer) { S.mx += ((pointer.x - 0.5) - S.mx) * 0.05; S.my += ((pointer.y - 0.5) - S.my) * 0.05; }
    settleTurn(now);
    const target = rig(now);
    frameCamera(target);
    animateModels(now, dt);
    syncGrid();
    syncAura(now);
    hoverGate();
    canvas.style.opacity = String(1 - params.dim * 0.8);
    // Colour pass, then normals and depth, then the edge shader to the screen.
    const ov = D.overlay.visible, hg = D.hbmGlow.visible, mc = D.memCells.visible;
    camera.layers.set(0);
    renderer.setRenderTarget(colorRT); renderer.render(scene, camera);
    D.overlay.visible = false; D.hbmGlow.visible = false; D.memCells.visible = false;
    scene.overrideMaterial = normalMat;
    const bg = scene.background; scene.background = null;
    renderer.setClearColor(0x7f7fff, 1);
    renderer.setRenderTarget(normalRT); renderer.clear(); renderer.render(scene, camera);
    scene.background = bg; scene.overrideMaterial = null; D.overlay.visible = ov; D.hbmGlow.visible = hg; D.memCells.visible = mc;
    U.cNear.value = camera.near; U.cFar.value = camera.far;
    renderer.setRenderTarget(null); renderer.render(quadScene, quadCam);
    // The streaks glow on top of the finished drawing.
    if (electrons.active || packets.active) {
      camera.layers.set(FX_LAYER);
      scene.background = null;
      renderer.autoClear = false;
      renderer.render(scene, camera);
      renderer.autoClear = true;
      scene.background = bg;
      camera.layers.set(0);
    }
    placeLabels();
    placeScalebar();
    if (running) raf = requestAnimationFrame(render);
  }
  function start() { if (!running) { running = true; last = performance.now(); raf = requestAnimationFrame(render); } }
  function stop() { running = false; cancelAnimationFrame(raf); }

  resize();
  applyTheme(theme);
  bakeKeys();
  // Every shader up front (in parallel where the browser can), so no part stalls the scroll the first time
  // it shows. The scene's own materials, as the colour pass draws them, plus the normal pass's two kinds.
  const warm = new THREE.Group().add(new THREE.Mesh(quad.geometry, normalMat), new THREE.InstancedMesh(quad.geometry, normalMat, 1));
  scene.add(warm);
  renderer.setRenderTarget(colorRT);
  renderer.compileAsync(scene, camera);
  renderer.setRenderTarget(null);
  scene.remove(warm);
  // The robot's parts (0.5 MB) load once the page is up; they are first needed far down the story.
  const loadRobot = () => R.load(`${import.meta.env.BASE_URL}robot.bin`).catch((e) => console.warn('robot', e));
  if ('requestIdleCallback' in window) requestIdleCallback(loadRobot, { timeout: 4000 }); else setTimeout(loadRobot, 1500);
  if (new URLSearchParams(location.search).has('debug')) window.__scene = { get keys() { return order; }, scene, T, L, C, D, R, pkg, electrons, packets, S, params, hbmE, smE, render: () => render(performance.now()) };
  canvas.addEventListener('pointermove', onPointer, { passive: true });
  canvas.addEventListener('pointerleave', () => { pointer = null; }, { passive: true });

  return {
    S, keyNames: Object.keys(KEYS),
    get keys() { return order; },
    setKeys(list) { order = list.filter((k) => KEYS[k]); bakeKeys(); },
    resize() { resize(); bakeKeys(); }, applyTheme, start, stop, mountOverlays,
    setCallouts(beat) { if (beat !== callBeat) { callBeat = beat; assign = null; } },
    setPanelRect(r) { panelRect = r; },
    // Beta: a template's dark and light colour (hex) and how far the drawing has gone into them (0: none).
    setDuo(bg, ink, mix) {
      U.duoMix.value = mix;
      if (!mix) return;
      const a = new THREE.Color(bg).getRGB({}, THREE.SRGBColorSpace), b = new THREE.Color(ink).getRGB({}, THREE.SRGBColorSpace);
      U.duoBg.value.set(a.r, a.g, a.b); U.duoInk.value.set(b.r, b.g, b.b);
    },
    setBands(b) { bands = b; }, // a phone on its side frames a key from its card's top
    renderOnce() { render(performance.now()); },
    get params() { return params; },
  };
}

const _m = new THREE.Matrix4(), _p = new THREE.Vector3(), _s = new THREE.Vector3(), _q0 = new THREE.Quaternion(), _via = new THREE.Vector3();

function si(m, loose = false) {
  const units = [[1e-9, 'nm'], [1e-6, 'µm'], [1e-3, 'mm'], [1e-2, 'cm'], [1, 'm']];
  let u = units[0];
  for (const x of units) if (m >= x[0] * 0.999) u = x;
  if (u[1] === 'cm' && m < 1e-1 && !loose) u = [1e-3, 'mm'];
  const v = m / u[0];
  const s = v >= 100 || !loose ? Math.round(v) : v >= 10 ? Math.round(v) : Math.round(v * 10) / 10;
  return `${s} ${u[1]}`;
}
