## Visual grammar, tool by tool

**Nsight Systems timeline** ([User Guide](https://docs.nvidia.com/nsight-systems/UserGuide/index.html), [NVIDIA overhead blog](https://developer.nvidia.com/blog/understanding-the-visualization-of-overhead-and-latency-in-nsight-systems/))
- **Layout:** a row tree on the left and one shared time axis. Each CPU thread has a CUDA API row. Each GPU has rows per context and stream (kernels, memory), an NCCL row, and NVTX ranges projected onto GPU time. Sampled metric rows are optional: SMs Active, Tensor Active, DRAM bandwidth, NVLink, PCIe.
- **Colour:** the guide says "Kernel launches are represented by blue, while memory transfers are displayed in red." The blog's screenshots differ: host-to-device copies green, device-to-host pink, sync calls green, NVTX range grey. A black line from launch call to kernel start marks launch latency.
- **Density:** names appear inside slices only when zoomed in. At whole-step scale the rows look like a barcode. The telltale sign is white space on the GPU row under a solid CPU row.
- **Web:** keep a CPU lane, one GPU lane, one copy/NCCL lane, an NVTX phase bar and the gaps. Drop the row tree, thread names and mangled kernel names.

**Nsight Compute** ([Profiling Guide](https://docs.nvidia.com/nsight-compute/ProfilingGuide/index.html), [UI guide](https://docs.nvidia.com/nsight-compute/NsightCompute/index.html))
- **Roofline:** log-log axes, FLOP/s against arithmetic intensity. A sloped bandwidth roof meets a flat peak roof at the ridge point. The memory-bound area is shaded blue and the compute-bound area green. The outline colour of the achieved-value point shows which baseline it belongs to, so before and after fit on one chart. L1/L2/DRAM ceilings are optional.
- **Memory chart:** logical units are green, physical units (L1/TEX, L2, DRAM) blue, inactive units grey. Links show instruction or request counts and are coloured on a gradient from 0 to 100% of peak.
- **Occupancy calculator:** a line of occupancy against block size, with the current configuration as a blue circle.
- **Web:** keep the two roof segments, the ridge and one dot with a trail. Drop the cache ceilings and metric tables.

**PyTorch profiler in Perfetto** (the TensorBoard plugin is [deprecated](https://docs.pytorch.org/tutorials/intermediate/tensorboard_profiler_tutorial.html); use [Perfetto](https://perfetto.dev/docs/visualization/perfetto-ui) and HTA instead)
- **Layout:** thread tracks with nested `aten::` op stacks sit above per-stream GPU tracks. Flow arrows link each launch to its kernel. Zoom is on WASD.
- **Colour:** each slice's colour is a hash of its name ([colorizer source](https://cobalt.googlesource.com/cobalt/+/HEAD/third_party/perfetto/ui/src/common/colorizer.ts)), so colour tells you which op it is, not what kind. The [SAM-fast post](https://pytorch.org/blog/accelerating-generative-ai/) points to matmuls as "dark green on stream 7 7" ([baseline trace](https://pytorch.org/wp-content/uploads/2024/11/baseline_trace.jpg)). Its last trace shows "no more idle time (white space) between kernels".
- **HTA summaries** ([blog](https://pytorch.org/blog/trace-analysis-for-masses/)): stacked bars per rank of compute, non-compute and idle time ([image](https://pytorch.org/wp-content/uploads/2024/11/trace-image3.png)), a comm-compute overlap percentage per rank, and a kernel timeline across 8 ranks with 6 streams each ([image](https://pytorch.org/wp-content/uploads/2024/11/trace-image6.png)).
- **Web:** keep the op-to-kernel nesting and the gaps. Drop the hash colours.

**DCGM in Grafana** ([dashboard 12239](https://grafana.com/grafana/dashboards/12239-nvidia-dcgm-exporter-dashboard/), [JSON](https://github.com/NVIDIA/dcgm-exporter/blob/main/grafana/dcgm-exporter-dashboard.json))
- **Layout:** eight panels in a grid. Temperature and power graphs with gauges (green, then #EAB839, then red; power runs 0–2400 W), SM clocks, GPU utilisation, tensor-core utilisation (0–1) and framebuffer used. One line per GPU over the last 15 minutes.
- **Metrics:** the exporter turns on tensor-active, DRAM-active and NVLink by default. SM_ACTIVE and SM_OCCUPANCY are commented out ([default-counters.csv](https://github.com/NVIDIA/dcgm-exporter/blob/main/etc/default-counters.csv)).
- **Reading guide** ([DCGM docs](https://docs.nvidia.com/datacenter/dcgm/latest/user-guide/feature-overview.html)):
  - SM activity of 0.8 or more is "necessary, but not sufficient", and below 0.5 the GPU is likely used poorly.
  - SM occupancy is resident warps divided by the maximum.
  - Tensor-active of 1.0 means a tensor instruction every other cycle.
  - DRAM-active tops out near 0.8 in practice.
  - NVLink is reported as bytes per second, sent and received.
- **Web:** keep 3–4 lines on a 0–1 scale with a dashed rule at 0.8. Drop the gauges, panel chrome and tangled per-GPU lines (show one GPU, or eight small multiples).

**nvidia-smi and nvtop**
- [nvidia-smi](https://docs.nvidia.com/deploy/nvidia-smi/index.html) prints a box-drawn table (Fan, Temp, Perf, Pwr:Usage/Cap, Memory-Usage, GPU-Util) above a process table, and `dmon` prints one line per second. GPU-Util is the "percent of time … one or more kernels was executing". A kernel running on one SM therefore reads 100%, which is about 0.7% SM efficiency on an H100 ([Trainy](https://www.trainy.ai/blog/gpu-utilization-misleading-metric)).
- [nvtop](https://github.com/Syllo/nvtop) ([man page](https://manpages.ubuntu.com/manpages/noble/man1/nvtop.1.html)) is an htop-style terminal app: GPU and memory bars at the top, scrolling line plots in the middle, a sortable process list at the bottom.
- **Web:** at most a monospaced HUD or footnote.

## Before/after stories, ranked by how clearly they read

1. **CUDA graphs close launch gaps.** This is the clearest. Before, thin kernels are separated by white gaps; after, they sit end to end.
   - NVIDIA: a 2.9 µs kernel costs 9.6 µs with a sync after each kernel, 3.8 µs with overlapped launches and 3.4 µs in a graph ([blog](https://developer.nvidia.com/blog/cuda-graphs/)).
   - PyTorch, Mask R-CNN: the green CPU load is pinned at 100% while the blue GPU row sits idle ([before](https://pytorch.org/assets/images/cuda-image-4.png)). With graphs the kernels are tightly packed ([after](https://pytorch.org/assets/images/cuda-image-5.png)) and the graphed part drops from 31 ms to 6 ms ([blog](https://pytorch.org/blog/accelerating-pytorch-with-cuda-graphs/)).
   - llama.cpp decoding one request at a time: the gaps between kernels within each token become "very small", for up to 1.2x ([blog](https://developer.nvidia.com/blog/optimizing-llama-cpp-ai-inference-with-cuda-graphs/)).
2. **Decode is memory-bound.** This is closest to Kevin's work.
   - With one request, every matmul is a matrix-vector product.
   - MBU (memory bandwidth utilisation) = params × bytes per param × tok/s ÷ peak bandwidth. A 7B fp16 model at 107 tok/s on an A100 reaches 72%.
   - The gpt-fast post gives a ready-made scroll sequence: 25.5 → 107 tok/s (torch.compile with CUDA graphs) → 157 (int8) → 202 (int4) → 244.7 (everything combined) ([gpt-fast](https://pytorch.org/blog/accelerating-generative-ai-2/), [overhead trace](https://pytorch.org/wp-content/uploads/2024/11/image14.png)).
   - Visual: a roofline dot climbing the slope as batch size grows. GPU bf16 matmuls reach the ridge at around 300 tokens ([scaling book](https://jax-ml.github.io/scaling-book/roofline/)).
3. **Continuous batching fills bubbles.** A grid of slots against iterations: yellow prompt tokens, blue generated tokens, red end-of-sequence, white idle. Static batching leaves white tails after sequences finish. Continuous batching drops new sequences S5–S7 into the freed slots. vLLM gets up to 23x throughput ([Anyscale](https://www.anyscale.com/blog/continuous-batching-llm-inference)).
4. **Kernel fusion.** Many slivers merge into one wide block, with fewer round trips to global memory ([Horace He's fusion figure](https://horace.io/brrr_intro.html)). Trainy's case had GPU-Util already at 100%, yet fusion, plus parallelism tuning, raised MFU from 20% to 38% ([Trainy](https://www.trainy.ai/blog/gpu-utilization-misleading-metric)).
5. **Overlapping communication with compute.** This needs two lanes and a caption. Before, an NCCL block runs alone while compute waits; after, the chunks interleave. Async tensor parallelism gave about 29% on the forward pass and 8% end to end for Llama3 8B on 64 H100s ([PyTorch forum](https://discuss.pytorch.org/t/distributed-w-torchtitan-introducing-async-tensor-parallelism-in-pytorch/209487)). DeepSeek publishes real overlap traces ([profile-data](https://github.com/deepseek-ai/profile-data)).

## Rules for the stylised version

- **Colour by meaning.** Busy is the accent (amber in dark mode, red in light). Memory is neutral, communication is one muted second hue, idle is empty. Then animate the empty space collapsing.
- **Labels.** One number per scene (µs per kernel, tok/s, MBU %) and short kernel names ("matmul", "attn", "all-reduce").
- **Decode vs prefill.** Show them as paired sparklines: decode has DRAM-active high and tensor-active low, prefill the reverse. This pattern is my inference from the DCGM definitions, not taken from a published screenshot.

I couldn't see any image pixels, so the figure descriptions come from captions, alt text and article text. Nsight's colours also differ between the current guide and older screenshots.