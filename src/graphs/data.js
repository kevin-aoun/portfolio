// The numbers behind the memory chart, Kevin's own 80 GB drawn as an H100's memory, and the pace the 3D
// GPU shows while it fills: Llama 3.1 8B on one H100 SXM, modelled, not measured. Every value is a row of the
// corrected tables in .taste-skill/research/model-check.md. stageState() turns the chart's progress into
// what the 3D GPU shows.

const H100 = { gb: 85.03 }; // CUDA-visible GB
const WEIGHTS = 16.06; // GB resident, BF16
const KV2K = (2048 * 131072) / 1e9; // GB of BF16 KV cache per 2k-token sequence (0.268)
const ACT = 2; // GB kept for activations and CUDA graphs (the model's assumption)
// Seconds of SM time at the peak rate per decoded token at 2k context: 16.08 GFLOP at the BF16 rate.
const PEAK_S = 16.08e-3 / 989.4;
// Decode by batch size, BF16, 2k context: batch, tok/s per user, tok/s per GPU. It ends at the memory wall,
// 224 conversations (vLLM keeps 8% of the 85.03 GB back, 2 GB go to activations).
const DECODE = [[1, 153.5, 153], [2, 150.8, 302], [4, 145.8, 583], [8, 136.7, 1093], [16, 121.5, 1944], [32, 99.4, 3180],
  [64, 72.9, 4662], [128, 47.5, 6080], [224, 31.2, 6991]].map(([b, user, gpu]) => ({ b, user, gpu }));
const BMAX = 224;

// --- timing: the chart is a pure function of q, its progress through the hold ---
export const clamp01 = (x) => Math.min(1, Math.max(0, x));
export const seg = (q, a, b) => clamp01((q - a) / (b - a));
const ease = (t) => 1 - (1 - t) ** 3;
const lerp = (a, b, t) => a + (b - a) * t;

// Kevin's own 80 GB: the weights (preloaded at birth) load, the reserve comes off the top, then his skills
// fill the cache in his shares of it; what they leave is the reserve, which holds hiking and MMA. Colours:
// the tokenizer's five, in order and round again, the way it colours consecutive tokens.
export const MEM_BOX = { total: 80, weights: 16 };
export const SKILLS = [
  { name: 'Python & FastAPI', pct: 20 }, { name: 'Tokenomics', pct: 10 }, { name: 'GPU sizing & optimization', pct: 10 }, { name: 'AI fundamentals', pct: 10 },
].map((s, i) => ({ ...s, c: `tk${i % 5}` }));
export const RESERVE = { pct: 100 - SKILLS.reduce((a, s) => a + s.pct, 0), holds: 'hiking, MMA' };
export const memWeightsT = (q) => ease(seg(q, 0.06, 0.22));
export const memSkills = (q) => seg(q, 0.3, 0.84); // share of the skills' tiles in place

// --- what the 3D GPU shows ---
// util: SM time at the peak rate / time, floored so the SMs never go dark. hbm: memory traffic, 0..1.
// flow: packets per second from the stacks, one per 8 passes over the weights. memFill, memWeights: shares of
// the memory holding weights and cache, and weights alone. prefill: constant, so the SMs never flash here.
const FLOOR = 0.06;
const util = (x) => Math.max(FLOOR, Math.min(1, x));
// The pace at any batch between two rows of the table.
const along = (b) => {
  const j = Math.max(0, Math.min(DECODE.length - 2, DECODE.findIndex((x) => x.b >= b) - 1)), a = DECODE[j], z = DECODE[j + 1], t = clamp01((b - a.b) / (z.b - a.b));
  return { user: lerp(a.user, z.user, t), gpu: lerp(a.gpu, z.gpu, t) };
};

export function stageState(id, q) {
  if (id !== 'memory') return null;
  q = clamp01(q);
  // The die works harder as the cache fills: the pace of a BF16 batch as large as the share filled.
  const sk = memSkills(q), wt = memWeightsT(q), idle = sk === 0, r = along(BMAX * sk), { total, weights } = MEM_BOX;
  return { util: idle ? FLOOR : util(r.gpu * PEAK_S), hbm: idle ? 0.2 : 1, flow: idle ? 0 : Math.min(40, r.user / 8), packet: 1,
    memFill: (weights * wt + ((total - weights) * (100 - RESERVE.pct) / 100) * sk) / total, memWeights: (weights * wt) / total, prefill: 1 };
}

// Self-check: the memory wall reproduces the verified B_max (vLLM's 0.92 of 85.03 GB, less weights and 2 GB),
// a token costs 16.25 µs of SM time at peak, and every stage value stays in range and depends on q alone.
export function _selfTest() {
  const ok = Math.floor((0.92 * H100.gb - WEIGHTS - ACT) / KV2K) === BMAX && Math.abs(PEAK_S * 1e6 - 16.25) < 0.01
    && Array.from({ length: 101 }, (_, i) => i / 100).every((q) => {
      const s = stageState('memory', q);
      return JSON.stringify(s) === JSON.stringify(stageState('memory', q)) && ['util', 'hbm', 'memFill', 'memWeights'].every((k) => s[k] >= 0 && s[k] <= 1) && s.flow >= 0 && s.flow <= 40;
    });
  if (!ok) throw new Error('graphs data self-test failed');
  return true;
}
