## Verdict

The arithmetic holds up. Every FLOP, byte, roofline, decode, prefill and waterfall value reproduces to rounding. One quirk: the author computed at 989.4 / 1,978.9 TFLOPS, not the 989 / 1,979 shown in the inputs table. The real problems are elsewhere: memory sizing, two misused calibration sources, the explanation of why continuous batching helps, and an off-by-one in answer time. Apart from the continuous-batching attribution, which rests on an unstated assumption, no number moves by more than about 1.5%.

## Errors and unsupported claims (most important first)

1. **Continuous batching (step 0 to 1) rests on an unstated assumption and gives the wrong reason.**
   - **The assumption.** The workload says "every request has 256 output tokens", but step 0 runs each static batch for 512 steps. The 1.95× gain only holds if answer lengths vary (mean 256, max 512), and that needs saying.
   - **If every answer were exactly 256 tokens:** static batching gives 14.18 ms per step, 2,398 tok/s per GPU and $0.341/M. Continuous batching would then be **1.24×**, not 1.95×.
   - **The wrong reason.** The text says prefill runs "on compute the GEMMs leave idle". The model's own step 1 contradicts this: the GEMMs are compute-bound, at 13.66 ms against a 6.40 ms weight-read floor.
     - Idle compute absorbs only about 203 of the 512 prefill tokens per step, so 58% of the prefill cost remains.
     - Of the 5.21 s saved per 16,384 tokens, **3.87 s (74%) comes from dropping padded slots** and 1.34 s (26%) from overlapping prefill with decode.

2. **The SGLang cross-check of speculative decoding is not a like-for-like comparison.**
   - SGLang's 158.34 → 373.25 tok/s used a tree draft: `--speculative-num-steps 3 --speculative-eagle-topk 4 --speculative-num-draft-tokens 16 --dtype float16`, on MT-Bench. The model assumes a k=3 chain at τ=2.8. SGLang's 2.36× is therefore not evidence for the model's 2.43×. ([SGLang](https://docs.sglang.io/advanced_features/speculative_decoding.html))
   - The RedHat τ values are quoted correctly (k=3: 2.50 summarisation, 2.83 math, 3.02 code). They were measured on 1×A100 with vLLM 0.11.0 at temperature 0.6, and there is no chat result. ([RedHat EAGLE-3](https://huggingface.co/RedHatAI/Llama-3.1-8B-Instruct-speculator.eagle3))

3. **The Databricks 60% figure is quoted out of context.**
   - The source says "MBU of 60% on 2xH100-80GBs as compared to 55% on 4xA100-40GB". That is two H100s with tensor parallelism, not one.
   - It points to an efficiency of 0.6, not the 0.7 the model uses. The 0.7 rests on SGLang alone: 15.01 GB × 158.34 /s = 2.38 TB/s, which is 71% of 3.35 TB/s.
   - ([Databricks](https://www.databricks.com/blog/llm-inference-performance-engineering-best-practices))

4. **B_max starts from nvidia-smi's memory figure, but vLLM sizes from the memory CUDA reports.**
   - The ICC page the model already cites shows deviceQuery reporting **85,028,765,696 B** next to nvidia-smi's 81,559 MiB (85.52 GB). ([ICC](https://www.icc-usa.com/blog/hgx-8x-h100-benchmarks))
   - A PyTorch out-of-memory error on an H100 reports 79.32 GiB (85.17 GB). ([HF](https://huggingface.co/nvidia/Llama-3.1-Nemotron-70B-Instruct/discussions/10))
   - **Corrected B_max** with 0.92 × 85.03 GB:
     - BF16 weights: **224 / 56** with BF16 KV and **448 / 112** with FP8 KV (was 225 / 56 and 451 / 112).
     - FP8 weights: **250 / 62** with BF16 KV and **500 / 125** with FP8 KV (was 251 / 62 and 503 / 125).
   - **The 0.92 default is correct**: the current stable docs say "default value of 0.92". The dev docs change it to 1.0 when the extensible KV cache is on. ([stable](https://docs.vllm.ai/en/stable/configuration/engine_args.html), [latest](https://docs.vllm.ai/en/latest/configuration/engine_args.html))
   - The 2 GB reserve must also cover the CUDA context and other non-PyTorch memory, and that is unverified. The "Available KV cache memory" line in vLLM's startup log is the ground truth.

5. **answer_256_s counts one token step too many.** TTFT already delivers token 1, so the time is TTFT + 255 × TPOT (or 255/τ steps for speculative decoding).
   - Corrected: 6.93 / 5.55 / 3.80 / 2.87 / 1.19 s.
   - Was: 6.95 / 5.57 / 3.81 / 2.88 / 1.20 s.
   - The overall 5.8× is unchanged.

6. **The prefix-cached TTFT is 6.5 ms, not 6.4 ms.** One forward pass reads the weights (6.40 ms) plus the 2k KV cache (0.11 ms). It also has to compute at least the last token to get logits, so the FLOPs are about 0.016 TFLOP, not 0.

7. **"FP8 halves the bytes streamed and doubles GEMM throughput" is imprecise.**
   - Streamed bytes go from 15.01 to 8.03 GB, which is 53.5%, because the lm_head stays BF16.
   - At step 2 the GEMMs are compute-bound, so all of the 1.46× comes from the FP8 tensor-core rate (GEMM time 13.66 → 6.88 ms). The byte saving plays no part.

8. **The inputs table and the arithmetic use slightly different peaks.** The "594 TFLOPS" figure and values such as 35.777 ms at B=256 only reproduce with 989.4 / 1,978.9 TFLOPS. Halving the datasheet's sparse figures gives 989.5 / 1,979. The difference is under 0.05%; just state which basis was used.

9. **Some rows describe impossible configurations.**
   - Roofline rows B=256 and B=512 cannot fit in BF16 at 2k: the KV cache alone is 68.7 / 137.4 GB, plus 16.06 GB of weights. Mark them as hypothetical, as the decode table does.
   - Likewise, the "flattens above B≈253" region is out of reach for BF16 at 2k (B_max 224). Only the FP8 configuration gets there.

10. **"GEMMs: AI ≈ B" holds for BF16 only.** FP8 block linears have AI ≈ 2B. They cross the FP8 ridge (591 at peak, 506 effective) at the same B ≈ 295 / 253.

11. **Two claims have no source:** "Paged attention often reaches only 50–70% of bandwidth" and "Expect real throughput 10–20% below". Label them as judgment.

12. **The quoted speedups are correct but leave out the conditions they were measured under:**
    - MagicDec 2.51×: "for moderate to long sequences", "on various types of hardware". ([arXiv](https://arxiv.org/abs/2408.11049))
    - vLLM 1.4× / 1.8× slowdowns: Llama3-70B on 4×H100, ShareGPT and CNN/DailyMail, using draft-model and n-gram speculation, not EAGLE. ([vLLM](https://vllm.ai/blog/2024-10-17-spec-decode))
    - Anyscale 8× / 23×: OPT-13B on 1×A100-40GB. ([Anyscale](https://www.anyscale.com/blog/continuous-batching-llm-inference))
    - Sarathi-Serve 2.6×: Mistral-7B on 1×A100, against vLLM, under tail-latency constraints. ([arXiv](https://arxiv.org/abs/2403.02310))
    - FlashInfer 31×: a single-kernel result with a 32k shared prefix, batch ≥128, against vLLM PageAttention. ([FlashInfer](https://flashinfer.ai/2024/02/02/cascade-inference.html))

13. **The Silicon Data page contradicts itself.** The header and trend table give $2.94 on 2 Nov 2026 and $2.78 on 4 Oct, which match the model. The FAQ on the same page says "$2.53". Cite the dated table row. explainx noticed the same discrepancy.

14. **Not modelled, and a real risk: the L2 cache with prefix caching.**
    - vLLM shares reference-counted physical blocks ([docs](https://docs.vllm.ai/en/latest/design/prefix_caching.html)), so all 64 sequences read the same prefix pages.
    - Per layer the 2k prefix is 2,048 × 4,096 B = 8.4 MB, well under the 50 MB L2. Part of step 3's 7.8 ms KV time may never reach HBM.
    - Step 3 could therefore land anywhere between 11.2 ms and the 4.0 ms cascade case. That would shift gain from the cascade note into the prefix-caching bar.
    - The speculative-decoding ratio barely moves (about 2.41×), because the GEMMs at 256 tokens sit right at the ridge.
    - Measure DRAM bytes per decode step with Nsight Compute before charting step 3.

## What checks out

- **H100 datasheet:** 1,979 / 3,958 TFLOPS with sparsity (so 989 / 1,979 dense), 3.35 TB/s, 80 GB, up to 700 W. ([NVIDIA](https://www.nvidia.com/en-us/data-center/h100/))
- **Hopper whitepaper V1.02, Table 3 (pp. 39–40):** 1000/2000 TFLOPS, 2000/4000 TFLOPS and 3000 GB/s, all marked preliminary. 50 MB L2, 132 SMs (144 on the full GH100), 80 B transistors, 814 mm². nvidia-smi shows 81,559 MiB.
- **config.json:** every value matches, and the embeddings are untied. N = 8,030,261,248.
- **Bytes:** 16.06 / 9.08 GB resident, 15.01 / 8.03 GB streamed per step, 131,072 B of KV per token.
- **RedHat FP8:** only the block linears are quantised, `ignore: ["lm_head"]`, and accuracy recovery is 99.52%.
- **Roofline:**
  - 16.08 / 19.30 GFLOP per token, and every roofline row.
  - Asymptotes 59.9 / 18.0 FLOP/B; ridge 295 / 591 (253 / 506 effective).
  - Attention AI 4 / 8; per-kernel sum gives 169 vs 181 TFLOPS at B=512.
- **Decode:**
  - The step-time formula, 156 tok/s at B=1, and "identical up to B=253, at most 10% higher up to B=512".
  - Every cell of the decode table.
- **Prefill:** 29.69 / 131.94 TFLOP, attention 3.7% / 13.3%, TTFT 50.0 / 25.9 / 222.3 / 125.9 ms.
- **Prices:** all eight list and marketplace prices and both index readings match the pages cited. explainx gives $2.00 on 9 Dec 2025.
- **Waterfall and sensitivities:**
  - Step times, tok/s, $/M, TTFT, deltas, and the 1.95 / 1.46 / 1.31 / 2.43× factors.
  - Overall 9.0× / 3.2× / 5.8×, and $0.0065/M per total token.
  - 1.04× with 512-token answers.
  - τ=2.0 gives 1.73× and $0.083; cascade gives 2.8× and $0.051; FP8 KV gives 7.32 ms (+53%).

## Corrected tables

```csv
spec,value,note
bf16_dense_tflops,989.4,"datasheet 1,979 with sparsity; all tables computed at 989.4 (989.5 changes <0.05%)"
fp8_dense_tflops,1978.9,"datasheet 3,958 with sparsity"
hbm3_tb_s,3.35,"whitepaper V1.02 Table 3 preliminary value: 3,000 GB/s"
hbm3_gb,80,"nvidia-smi 81,559 MiB = 85.52 GB; CUDA-visible 85,028,765,696 B = 85.03 GB (used for B_max)"
l2_mb,50,
sms,132,"full GH100 has 144"
tdp_w,700,"up to; configurable"
transistors_bn,80,"814 mm2 die"
eff_compute,0.6,"assumption: 593.6 TFLOPS BF16, 1187.3 FP8"
eff_bandwidth,0.7,"2.345 TB/s; SGLang 158.34 tok/s at B=1 implies 0.71"
usd_per_gpu_hour,2.94,"SDH100RT, 2 Nov 2026"
```

```csv
quantity,bf16,fp8_redhat_weights_and_fp8_kv,unit
params,8030261248,8030261248,
weights_resident,16.06,9.08,GB
weights_streamed_per_step,15.01,8.03,GB
kv_per_token,131072,65536,B
kv_per_seq_2k,0.268,0.134,GB
kv_per_seq_8k,1.074,0.537,GB
linear_flop_per_decode_token,15.01,15.01,GFLOP
attn_flop_per_kv_token,0.524,0.524,MFLOP
```

```csv
B,gflop_per_step,gb_per_step,flop_per_byte,attainable_tflops,pct_of_peak,fits_bf16_2k
1,16.08,15.28,1.05,3.53,0.36,yes
8,128.7,17.16,7.50,25.1,2.5,yes
32,514.7,23.60,21.8,73.1,7.4,yes
64,1029,32.19,32.0,107.1,10.8,yes
128,2059,49.37,41.7,139.7,14.1,yes
256,4117,83.73,49.2,164.7,16.6,no
512,8235,152.45,54.0,181.0,18.3,no
```

```csv
weights,kv,bmax_ctx2048,bmax_ctx8192
bf16,bf16,224,56
bf16,fp8,448,112
fp8,bf16,250,62
fp8,fp8,500,125
```

The decode table's values are unchanged. Rows with B above B_max (224 / 56 / 500) do not fit in memory and should be drawn as hypothetical.

```csv
B,bf16_2k_ms,bf16_2k_user,bf16_2k_gpu,bf16_2k_usd_M,bf16_8k_ms,bf16_8k_user,bf16_8k_gpu,fp8_2k_ms,fp8_2k_user,fp8_2k_gpu,fp8_2k_usd_M
1,6.515,153.5,153,5.32,6.859,145.8,146,3.482,287.2,287,2.84
2,6.630,150.8,302,2.71,7.317,136.7,273,3.539,282.6,565,1.45
4,6.859,145.8,583,1.40,8.232,121.5,486,3.653,273.7,1095,0.746
8,7.317,136.7,1093,0.747,10.064,99.4,795,3.882,257.6,2061,0.396
16,8.232,121.5,1944,0.420,13.727,72.9,1166,4.340,230.4,3686,0.222
32,10.064,99.4,3180,0.257,21.053,47.5,1520,5.256,190.3,6088,0.134
64,13.727,72.9,4662,0.175,35.705,28.0,1792,7.088,141.1,9030,0.090
128,21.053,47.5,6080,0.134,65.010,15.4,1969,10.751,93.0,11906,0.069
256,35.777,28.0,7155,0.114,123.69,8.1,2070,18.115,55.2,14132,0.058
512,71.555,14.0,7155,0.114,247.38,4.0,2070,36.230,27.6,14132,0.058
```

```csv
config,b_max,step_ms,tok_s_user,tok_s_gpu
bf16_2k,224,32.0,31.2,6991
bf16_8k,56,32.0,31.2,1748
fp8_2k,500,35.4,28.3,14132
```

```csv
prompt,precision,tflop,ttft_ms,prefill_tok_s
2048,bf16,29.69,50.0,40950
2048,fp8,29.69,25.9,78980
8192,bf16,131.94,222.3,36860
8192,fp8,131.94,125.9,65050
2048_prefix_cached,bf16,0.016,6.5,
```

```csv
provider,usd_per_gpu_hour,type,as_of
Silicon Data SDH100RT,2.94,neocloud index (page FAQ says 2.53),2026-11-02
Silicon Data SDH100RT,2.78,neocloud index,2026-10-04
Silicon Data via explainx,2.00,index,2025-12-09
Vast.ai single H100 SXM,1.68,marketplace (unverified host),2026-10-10
Runpod Community SXM,2.69,on-demand,2026-10
Spheron,2.98,on-demand,2026-11
Lambda 8x SXM,3.99,on-demand,2026-10
Nebius HGX,4.50,on-demand (was 3.85 before 2026-10-01),2026-10
AWS p5.48xlarge,6.88,on-demand,2026-10
Azure ND96isr H100 v5,12.29,on-demand,2026-10
```

The waterfall below is the original with the answer_256_s column fixed. Overall: 9.0× cheaper, 3.2× faster per user, a 256-token answer arrives 5.8× sooner, and the final cost per total token is $0.0065/M.

```csv
step,label,step_ms,tok_s_user,tok_s_gpu,usd_per_M_out,delta_usd,ttft_ms,answer_256_s
0,Static batching BF16,14.64,68.3,1532,0.533,0,3200,6.93
1,+ Continuous batching,21.44,46.6,2985,0.274,-0.259,86,5.55
2,+ FP8 weights,14.67,68.2,4363,0.187,-0.087,59,3.80
3,+ Prefix caching,11.21,89.2,5710,0.143,-0.044,11,2.87
4,+ Speculative decoding,12.93,216.5,13855,0.059,-0.084,13,1.19
```

```csv
variant,step_ms,tok_s_user,tok_s_gpu,usd_per_M_out,note
0_equal_256_answers,14.18,70.5,2398,0.341,"no length variance: continuous batching is then 1.24x; answer 6.82 s"
3_plus_fp8_kv,7.32,136.7,8747,0.093,"not in totals"
3_plus_cascade,4.00,250.2,16013,0.051,"not in totals; also roughly the best case of L2 reuse (item 14)"
4_tau_2.0,12.93,154.6,9897,0.083,"1.73x instead of 2.43x"
```

## Corrected assumptions

- **Peaks and efficiency:** 989.4 / 1,978.9 dense TFLOPS and 3.35 TB/s. Efficiency is 0.6 for compute (an assumption) and 0.7 for bandwidth (calibrated to SGLang's 158.34 tok/s at batch 1, which implies 71%). Databricks' 60% was measured on 2×H100 and is a lower bound.
- **Memory:** B_max = floor((0.92 × 85.03 GB − resident weights − 2 GB) / (ctx × KV bytes per token)). 0.92 is vLLM's current default. 85.03 GB is the CUDA-visible total; driver versions vary it by about ±1 sequence. The 2 GB covers activations, CUDA graphs and the CUDA context, and is unverified.
- **ctx** is the average KV length per sequence. Activation traffic, KV writes, sampling and scheduler time are ignored.
- **Waterfall workload:**
  - A shared 2,048-token system prompt; output lengths average 256 tokens with a maximum of 512, and static batches pad to 512.
  - 64 sequences in flight; chunked prefill of 512 tokens per step equals demand, so the prefill budget is 100% used and any bursty arrivals will queue.
  - All GPU time is charged to output tokens; answer time = TTFT + 255 × TPOT.
- **FP8** means RedHat's W8A8 static per-tensor checkpoint: block linears in FP8, embeddings and lm_head in BF16, with the lm_head GEMM at the BF16 rate. The KV cache stays BF16 in the waterfall.
- **Prefix caching** is modelled as skipped prefill only. L2 reuse of shared blocks and cascade attention are not modelled, so step 3's KV time is an upper bound.
- **Speculative decoding:** EAGLE-3 chain with k=3 and τ=2.8 (RedHat's k=3 range is 2.50–3.02, measured on A100 at temperature 0.6). The 15% draft overhead is an assumption, and KV is read once per verification. This is the least certain bar.
- **Price:** $2.94 per GPU-hour; costs scale linearly with it.

## Sources

- https://www.nvidia.com/en-us/data-center/h100/
- https://developer.nvidia.com/blog/nvidia-hopper-architecture-in-depth/
- https://www.ece.lsu.edu/koppel/gp/refs/gtc22-whitepaper-hopper.pdf (V1.02, Table 3, pp. 39–40)
- https://www.icc-usa.com/blog/hgx-8x-h100-benchmarks
- https://huggingface.co/nvidia/Llama-3.1-Nemotron-70B-Instruct/discussions/10
- https://huggingface.co/unsloth/Meta-Llama-3.1-8B/raw/main/config.json
- https://huggingface.co/RedHatAI/Meta-Llama-3.1-8B-Instruct-FP8
- https://huggingface.co/RedHatAI/Llama-3.1-8B-Instruct-speculator.eagle3
- https://docs.vllm.ai/en/stable/configuration/engine_args.html
- https://docs.vllm.ai/en/latest/configuration/engine_args.html
- https://docs.vllm.ai/en/latest/design/prefix_caching.html
- https://docs.sglang.io/advanced_features/speculative_decoding.html
- https://www.databricks.com/blog/llm-inference-performance-engineering-best-practices
- https://vllm.ai/blog/2024-10-17-spec-decode
- https://arxiv.org/abs/2408.11049
- https://www.anyscale.com/blog/continuous-batching-llm-inference
- https://arxiv.org/abs/2403.02310
- https://flashinfer.ai/2024/02/02/cascade-inference.html
- https://www.silicondata.com/products/silicon-index/h100
- https://explainx.ai/blog/nvidia-h100-gpu-rental-price-45-percent-since-december-silicon-data-chamath-claimed-vs-verified-2026
- https://intuitionlabs.ai/articles/h100-rental-prices-cloud-comparison
- https://www.spheron.network/blog/h100-price-per-hour-2026/

**Not checked:** I did all the arithmetic by hand, twice, without running code. Two statements come from my knowledge of vLLM's code, not a fetched page: that vLLM sizes memory from CUDA's total, and that it recomputes the last token on a full cache hit.

**Risk:** the step 3 bar (L2 reuse, item 14) and the speculative-decoding bar are the numbers most likely to differ on real hardware, and neither has been measured.