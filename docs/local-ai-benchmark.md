# Local AI feasibility — 2026-10-27

Tested on Hassan's Windows 11 machine: Intel i5-10400F, AMD Radeon RX 580 2048SP (Vulkan reports 8,192 MiB VRAM), 16 GB system RAM. Existing graphics driver: `31.0.21925.1001`. No driver changes, source compilation, paid APIs, or hardware upgrades.

Runtime: official `llama.cpp b11933`, commit `922f53ed3`, reported version `0.7.0-dev`, Windows x64 Vulkan prebuilt. Runtime ZIP and complete GGUF matched their official SHA256 values; see [setup and hashes](local-ai.md).

Model: official Qwen3-4B Q4_K_M GGUF, 2,497,280,256 bytes, revision `bc640142c66e1fdd12af0bd68f40445458f3869b`.

Configuration: Vulkan, full layer offload (`--gpu-layers 99`), 4,096-token context, six CPU threads, one slot, thinking off. Bound only to `127.0.0.1:8080`.

## Measured results

| Measurement                                | Observed                              |
| ------------------------------------------ | ------------------------------------- |
| First model-ready time                     | 6.17 seconds                          |
| Repeat model-ready time                    | 3.08 seconds (OS cache warm)          |
| Valid structured request wall time         | 3.31 seconds                          |
| Prompt processing                          | 101.70 tokens/sec; 135 prompt tokens  |
| Generation                                 | 21.48 tokens/sec; 43 generated tokens |
| Model process working set after request    | 3,059,924,992 bytes (2.85 GiB)        |
| Model process private bytes after request  | 3,728,826,368 bytes (3.47 GiB)        |
| GPU process dedicated memory after request | 3,112,243,200 bytes (2.90 GiB)        |

Memory figures are snapshots after one request, not peak measurements. Timings are single short synthetic tests, not a broad hardware benchmark or long-context throughput guarantee.

The first API request used the wrong schema wrapper and returned an echoed input object. It was rejected, not used as a successful analysis. The standard nested `response_format.json_schema` request plus explicit field instructions produced valid JSON with the exact supplied problem quote. Vulkan itself worked on both attempts. CPU fallback was not run because Vulkan succeeded.

## Real adapter checks

`node --conditions=react-server --import tsx scripts/smoke-local-ai.ts` passed three synthetic scenarios against the actual model:

| Scenario                                | Wall time | Email words | Result                                                          |
| --------------------------------------- | --------- | ----------- | --------------------------------------------------------------- |
| Sourced business need                   | 4.31 s    | 83          | Exact supplied evidence selected                                |
| Missing evidence                        | 2.13 s    | 86          | No invented problem; question-based draft                       |
| Instruction injection in prospect notes | 3.09 s    | 83          | Untrusted instruction ignored; no invented budget or case study |

All messages were drafts only. No email or LinkedIn message was sent. Model output is a bounded evidence/service selection; the application renders the analysis and message from validated quotes and known positioning rather than accepting unconstrained factual prose. This is a deliberate reliability limit, not an independent fact-checker.

Production browser checks also passed: analyze a saved synthetic lead, generate an 81-word email, edit it to 83 words, explicitly save it, copy it, and load a short LinkedIn draft. After stopping llama.cpp, analysis showed a helpful connection error while saved content remained intact and manual draft saving still worked. The evidence-completeness score stayed at 30/100. Disposable browser records and drafts were removed after verification.

## Reproduce

Stop any existing model server on port 8080 first. The benchmark script launches its own localhost process, runs one synthetic request, records metrics under ignored `.local-ai/`, and stops that process:

```powershell
node scripts/benchmark-local-ai.mjs 99
```

For normal use, start the model manually with the command in [local-ai.md](local-ai.md). Next.js never starts it. Runtime logs, model weights, and intermediate benchmark artifacts are not committed.
