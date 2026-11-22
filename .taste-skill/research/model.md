# Llama 3.1 8B on one H100 SXM: an inference model for the charts

## 1. Verified inputs

```csv
spec,value,note
bf16_dense_tflops,989,"datasheet lists 1,979 with sparsity"
fp8_dense_tflops,1979,"datasheet lists 3,958 with sparsity"
hbm3_tb_s,3.35,"whitepaper v1.02 preliminary value was 3.0"
hbm3_gb,80,"nvidia-smi shows 81,559 MiB = 85.5 GB"
l2_mb,50,
sms,132,"the full GH100 has 144"
tdp_w,700,"up to; configurable"
transistors_bn,80,"814 mm2 die"
```

These numbers come from the NVIDIA H100 page (the datasheet) and from Table 3 of the Hopper whitepaper and NVIDIA's blog post about it. The whitepaper's 1000/2000 TFLOPS and 3,000 GB/s were preliminary. The datasheet's later values replace them.

**Llama 3.1 8B (config.json):** 32 layers, d=4096, 32 query heads, 8 KV heads, head_dim 128, FFN 14336, vocab 128,256, with untied embeddings. Every value matches what you listed. The parameter count is N = 2·V·d + L·(2d² + 2·d·1024 + 3·d·d_ff + 2d) + d = 1,050,673,152 + 32×218,112,000 + 4,096 = **8,030,261,248 ≈ 8.03B**.

## 2. Bytes

- **Weights:** 16.06 GB in BF16. In FP8 it is 8.03 GB if every tensor were FP8, but **9.08 GB as shipped**: the RedHat FP8 checkpoint quantises only the linear layers inside the transformer blocks and leaves the embeddings and lm_head in BF16.
- **Weights streamed per decode step:** everything except the embedding table, because only B rows of it are gathered. That is **15.01 GB in BF16 and 8.03 GB for the FP8 checkpoint**.
- **KV cache per token** = 2·L·n_kv·d_head·bytes = 2·32·8·128·2 = **131,072 B (128 KiB) in BF16** and 64 KiB in FP8. Per sequence that is 0.268 GB at 2k and 1.074 GB at 8k (half that with FP8 KV).

## 3. Decode roofline (ctx 2048, BF16, at peak rates)

- FLOPs per token: F_tok = 2·N_mm + 4·L·d·ctx, where N_mm = 7,504,658,432 (block linears + lm_head). That gives 15.01 GFLOP + 0.524 MFLOP per context token: 16.08 GFLOP at 2k and 19.30 at 8k.
- Bytes per step: Bytes = W_stream + B·ctx·131,072. Intensity AI = B·F_tok/Bytes.
- Attainable TFLOPS = min(peak, AI × 3.35 TB/s).
- Ridge point: 989/3.35 = **295 FLOP/B for BF16** and 591 for FP8. With the efficiency factors below it is 253 and 506.

```csv
B,gflop_per_step,gb_per_step,flop_per_byte,attainable_tflops,pct_of_peak
1,16.08,15.28,1.05,3.53,0.36
8,128.7,17.16,7.50,25.1,2.5
32,514.7,23.60,21.8,73.1,7.4
64,1029,32.19,32.0,107.1,10.8
128,2059,49.37,41.7,139.7,14.1
256,4117,83.73,49.2,164.7,16.6
512,8235,152.45,54.0,181.0,18.3
```

- **Decode never reaches the ridge.** As B grows without limit, AI tends to F_tok/KV_seq = 59.9 FLOP/B at 2k (18.0 at 8k).
- It is worth plotting the two kernel types separately:
  - **GEMMs:** AI ≈ B, so they cross the ridge near B≈295.
  - **Attention:** AI = 4 with BF16 KV (8 with FP8 KV), because each KV head serves 4 query heads. It is always memory-bound.
- With the per-kernel sum, B=512 attains 169 TFLOPS rather than 181.

## 4. Decode step time

GEMM and attention kernels run one after the other, so I apply your max() to each kernel type and add the two:

`t = max(F_lin/(0.6·P), W/(0.7·BW)) + max(F_attn/(0.6·P), B·ctx·KV_tok/(0.7·BW))`

- This is identical to the single max() for B ≤ 253 and up to 10% higher above that.
- Effective rates: 594 TFLOPS (BF16), 1,187 TFLOPS (FP8 GEMMs) and 2.345 TB/s.
- **Calibration:** at B=1 with a short context the model gives 156 tok/s. SGLang measured 158.3 tok/s on an H100. Databricks reports 60% bandwidth utilisation at batch 1.
- Outputs: tok/s per user = 1/t and tok/s per GPU = B/t.

**Memory wall:** B_max = floor((0.92·85.5 GB − resident weights − 2 GB)/(ctx·KV_tok)). The 0.92 is vLLM's default gpu-memory-utilization. The 2 GB for activations and CUDA graphs is my assumption.

```csv
weights,kv,bmax_ctx2048,bmax_ctx8192
bf16,bf16,225,56
bf16,fp8,451,112
fp8,bf16,251,62
fp8,fp8,503,125
```

**Decode throughput by batch size.** "bf16" means BF16 weights and KV; "fp8" means FP8 weights and FP8 KV. Cost assumes $2.94 per GPU-hour and counts decode only. Rows with B above B_max (225 / 56 / 503) would not fit in memory; draw them as hypothetical.

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
512,71.554,14.0,7155,0.114,247.38,4.0,2070,36.230,27.6,14132,0.058
```

- **At the memory wall:**

  | Config | B_max | Step time | tok/s per user | tok/s per GPU |
  |---|---|---|---|---|
  | bf16, 2k | 225 | 32.2 ms | 31.1 | 6,997 |
  | bf16, 8k | 56 | 32.0 ms | 31.2 | 1,748 |
  | fp8, 2k | 503 | 35.6 ms | 28.1 | 14,132 |

- **Throughput flattens above B≈253.** The GEMMs become compute-bound there, so each extra sequence adds time in proportion.
- Plotting tok/s per GPU against tok/s per user gives the standard throughput-versus-interactivity curve.

## 5. Prefill and TTFT (batch 1)

F_pre = 2·N_blk·P + 2·L·d·P² (causal) + one row of logits. At these sizes both the GEMMs and the attention are compute-bound.

```csv
prompt,precision,tflop,ttft_ms,prefill_tok_s
2048,bf16,29.69,50.0,40950
2048,fp8,29.69,25.9,78980
8192,bf16,131.94,222.3,36860
8192,fp8,131.94,125.9,65050
2048_prefix_cached,bf16,0,6.4,
```

- Attention is 3.7% of prefill FLOPs at 2k and 13.3% at 8k.
- The FP8 rows run the GEMMs in FP8 and attention in BF16.
- TTFT here leaves out queueing, tokenisation and network time.

## 6. Price

- **Silicon Data H100 neocloud index (SDH100RT):** $2.94 per GPU-hour on 2 Nov 2026, up from $2.78 on 4 Oct. A secondary report puts it at about $2.00 in Dec 2025.
- **On-demand list prices, October 2026:**

  | Provider | $/GPU-hour |
  |---|---|
  | Runpod Community SXM | 2.69 |
  | Spheron | 2.98 |
  | Lambda 8×SXM | 3.99 |
  | Nebius | 4.50 |
  | AWS p5 | 6.88 |
  | Azure ND | 12.29 |

- **Marketplace:** Vast.ai about $1.68.
- **Value used: $2.94 per GPU-hour.** Costs scale linearly with price.

## 7. Waterfall

**Workload:**
- Every request has the same 2,048-token system prompt and 256 output tokens. The user turn is ignored.
- There are always 64 sequences in flight.
- All GPU time, prefill included, is charged to output tokens.
- A static batch runs until its longest answer (512 tokens) finishes.
- Continuous batching feeds prefill in chunks of 512 tokens per step.

```csv
step,label,step_ms,tok_s_user,tok_s_gpu,usd_per_M_out,delta_usd,ttft_ms,answer_256_s
0,Static batching BF16,14.64,68.3,1532,0.533,0,3200,6.95
1,+ Continuous batching,21.44,46.6,2985,0.274,-0.259,86,5.57
2,+ FP8 weights,14.67,68.2,4363,0.187,-0.087,59,3.81
3,+ Prefix caching,11.21,89.2,5710,0.143,-0.044,11,2.88
4,+ Speculative decoding,12.93,216.5,13855,0.059,-0.084,13,1.20
```

**Overall:** 9.0× cheaper, 3.2× faster per user, and a 256-token answer arrives 5.8× sooner. Per total token the final cost is $0.0065 per million.

- **Continuous batching (1.95×):**
  - Padded slots disappear, and prefill runs inside decode steps on compute the GEMMs leave idle.
  - Speed per user falls because every step carries 512 prefill tokens. That is the TTFT-versus-TPOT trade-off the chunk size controls.
  - TTFT drops from 3.2 s (plus up to 10.7 s queueing) to 86 ms.
  - For comparison, Anyscale measured 8× (23× with vLLM) over Hugging Face static batching. Sarathi-Serve's chunked prefill gave 2.6× serving capacity.
- **FP8 weights (1.46×):** this halves the bytes streamed per step and doubles GEMM throughput. The RedHat checkpoint recovers 99.5% of accuracy.
- **Prefix caching (1.31×):**
  - It skips 29.7 TFLOP of prefill per request and cuts TTFT from 59 ms to 11 ms.
  - The gain depends on the ratio of prompt to output tokens. With 512-token answers it shrinks to about 1.04×, because chunked prefill already hides most of the prefill.
- **Speculative decoding (2.43×):**
  - Settings: EAGLE-3 with k=3, acceptance length τ=2.8 and 15% draft overhead. RedHat's k=3 results are 2.50 (summarisation), 2.83 (math) and 3.02 (code).
  - At 2k context the step is bound by KV reads (7.8 of 11.2 ms), so verifying 4 tokens costs about as much as decoding 1.
  - The same model at batch 1 predicts 2.43×. SGLang measured 2.36× (158 → 373 tok/s).

## 8. Assumptions, and where real systems differ

- **Efficiency factors are fixed** at 0.7 of bandwidth and 0.6 of compute. Paged attention often reaches only 50–70% of bandwidth. I also ignored activation traffic, sampling and CPU or scheduler time. Expect real throughput 10–20% below these tables.
- **Ctx means the average KV length per sequence.** Chunked prefill is modelled as perfectly smooth. Bursty arrivals make rows 1 and 2 optimistic.
- **The speculative decoding row is the least certain number.**
  - vLLM measured 1.4–1.8× *slowdowns* at high QPS (Llama3-70B on 4×H100).
  - MagicDec reports up to 2.51× for Llama-3.1-8B at batch 32–256.
  - With τ=2.0 the step gives 1.73× instead, and the final cost is $0.083 per million.
- **Prefix caching is modelled only as skipped prefill.**
  - vLLM also shares cached blocks in memory, which raises B_max.
  - A shared-prefix ("cascade") attention kernel reads the 2k prefix once per step rather than 64 times. FlashInfer reports up to 31× on the attention kernel.
  - In this model that would be another 2.8× (to $0.051 per million before speculative decoding). It is not in the totals.
- **FP8 KV cache** is not in the waterfall. It would make step 3 53% faster (7.32 ms per step).
- **B_max is a ceiling.** Memory fragmentation and long outputs lower it.

**Sources:**
- https://www.nvidia.com/en-us/data-center/h100/
- https://developer.nvidia.com/blog/nvidia-hopper-architecture-in-depth/
- https://www.ece.lsu.edu/koppel/gp/refs/gtc22-whitepaper-hopper.pdf
- https://www.icc-usa.com/blog/hgx-8x-h100-benchmarks
- https://huggingface.co/unsloth/Meta-Llama-3.1-8B/raw/main/config.json (mirror; the official repo https://huggingface.co/meta-llama/Llama-3.1-8B is gated)
- https://huggingface.co/RedHatAI/Meta-Llama-3.1-8B-Instruct-FP8
- https://docs.vllm.ai/en/latest/configuration/engine_args.html
- https://docs.vllm.ai/en/latest/design/prefix_caching.html
- https://www.databricks.com/blog/llm-inference-performance-engineering-best-practices
- https://docs.sglang.io/advanced_features/speculative_decoding.html
- https://huggingface.co/RedHatAI/Llama-3.1-8B-Instruct-speculator.eagle3
- https://vllm.ai/blog/2024-10-17-spec-decode
- https://arxiv.org/abs/2408.11049
- https://www.anyscale.com/blog/continuous-batching-llm-inference
- https://arxiv.org/abs/2403.02310
- https://flashinfer.ai/2024/02/02/cascade-inference.html
- https://www.silicondata.com/products/silicon-index/h100
- https://explainx.ai/blog/nvidia-h100-gpu-rental-price-45-percent-since-december-silicon-data-chamath-claimed-vs-verified-2026
- https://intuitionlabs.ai/articles/h100-rental-prices-cloud-comparison
- https://www.spheron.network/blog/h100-price-per-hour-2026/

Not covered: multi-GPU, energy per token, a Blackwell comparison, and the Llama 3 paper itself. I worked all the arithmetic by hand (no code run) and checked each value twice.

Risk: the speculative decoding bar at 64 concurrent users could realistically land anywhere from 1.0× to 2.5×, and the price index moves weekly.