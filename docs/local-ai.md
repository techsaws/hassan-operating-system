# Local AI runtime

The app never launches a model process. Start llama.cpp yourself on `127.0.0.1`; do not expose either server publicly. No cloud API or API key is used.

Runtime: [official llama.cpp b11933 Windows x64 Vulkan build](https://github.com/ggml-org/llama.cpp/releases/tag/b11933).
Model: [official Qwen3-4B-GGUF, Q4_K_M](https://huggingface.co/Qwen/Qwen3-4B-GGUF/tree/bc640142c66e1fdd12af0bd68f40445458f3869b).

Files are stored only in the ignored `.local-ai/` directory:

- `.local-ai/runtime/llama-server.exe` and bundled runtime DLLs
- `.local-ai/Qwen3-4B-Q4_K_M.gguf`

Verified download hashes:

- Runtime ZIP: `a4b755eb5371dd00b1de0a9fae144a51a6539f8193fd049ce1666aa78188fb40`
- Model GGUF: `7485fe6f11af29433bc51cab58009521f205840f5b4ae3a32fa7f92e8534fdf5`

## Start the local model (PowerShell)

```powershell
Set-Location 'D:\Internal Systems\hassanos'
.\.local-ai\runtime\llama-server.exe -m .\.local-ai\Qwen3-4B-Q4_K_M.gguf --host 127.0.0.1 --port 8080 --alias qwen3-4b --ctx-size 4096 --gpu-layers 99 --threads 6 --parallel 1 --reasoning off
```

Wait for the model to load. Keep this terminal open while using AI. Stop it with Ctrl+C. For a CPU fallback, use `--gpu-layers 0`.

Configuration belongs only in ignored `.env`:

```dotenv
AI_ENABLED=true
AI_BASE_URL=http://127.0.0.1:8080/v1
AI_MODEL=qwen3-4b
# Optional: one explicitly curated, relevant case study. Leave unset if none is verified.
# OUTREACH_CASE_STUDY_URL=https://your-verified-case-study-url
```

Only literal `127.0.0.1` HTTP endpoints are accepted. Disabled or offline AI must not prevent manual CRM or draft editing. Restart Next.js after changing environment configuration.

## Grounding and privacy

- Actions use saved lead details. Save lead edits before requesting suggestions.
- URLs are source labels supplied by the operator; no website is fetched or claimed to have been visited.
- Prospect notes are untrusted data, never instructions. The model selects a service, an exact sourced evidence quote, and a bounded next-action category.
- Zod and exact-quote checks reject invalid or ungrounded model output. A constrained draft builder uses only the selected quote, recorded company/contact, and Hassan's supplied service positioning.
- The model does not update qualification scores. Scores measure evidence completeness, not independently verified buying intent.
- No case studies or outcomes are invented. The portfolio is a general link, not a claimed case study. Any configured case-study URL still needs a human relevance check.
- Generated suggestions are transient. Only a deliberately saved message is persisted. Every draft must be reviewed and sent manually outside HassanOS.

Measured results are recorded separately in `docs/local-ai-benchmark.md`.
