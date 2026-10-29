# open-weights-private-mode

Status: ⬜ to start · 🟡 in progress · ✅ AI check passed **and** human check done. A row is never ✅ just because the code exists.

| # | How we build it (and with what) | AI check | Human check | Status |
| ---- | ------------------------------------------------------------ | ------------------------------------------------------------ | ------------------------------------- | ------ |
| 1 | Confirm (a) provider+model, (b) structured/vision, (c) Glimmer local docs. curl + live calls. | Findings recorded + provider choice confirmed | Confirm the provider choice | ✅ |
| 2 | meta.ts provider choice ('meta'/'open'/'local') + JSON-only instruction fallback + ProviderUnavailableError + jsonWithFallback. Muse Code. | `typecheck` passes, 16 meta/api tests pass | — | ✅ |
| 3 | Private-mode toggle + settings sheet + Meta-block list. Muse Code. | `typecheck` + `build` pass | Visual: sheet opens, toggle saves, list correct | 🟡 |
| 4 | Wire {private} in edit/hear/suggest + Meta→open fallback in build/edit/suggest + "Built with Muse Spark Open" UI. Muse Code. | `typecheck` passes | Visual: answeredBy line on fallback | 🟡 |
| 5 | try-open + gate + OPEN_* to Vercel + archive. | `pnpm test` 66/66 + `typecheck` + `build`; try-open PASS (open live, local skipped) | OPEN_* to Vercel Prod+Preview, redeploy, run try-open | 🟡 |

## Decisions

- 2026-10-28 (a) Keys exist for all three partners; FIREWORKS PROVEN live: base https://api.fireworks.ai/inference/v1, model accounts/fireworks/models/muse-spark-open (816B MoE, reasoning model), credits live (usage returned). Partner pages: fireworks.ai/models/fireworks/muse-spark-open, baseten.co/library/muse-spark-open, modal.com/library/meta/muse-spark-open. Baseten/Modal untested (Modal needs own vLLM GPU deploy).
- 2026-10-28 (b) Fireworks endpoint: response_format json_schema REJECTED (400 "Unable to parse request body"); json_object ACCEPTED; reasoning_effort accepted; image_url accepted syntactically but model reports no image (no usable vision). So: 'open' uses json_object + "reply with only JSON" + Zod gate; teach/features stays on Meta (both providers: no vision).
- 2026-10-28 (c) Glimmer 30B local: Ollama (installed; daemon uncheckable from sandbox) `ollama run muse-glimmer:30b-mlx` (Mac MLX build, ollama.com/library/muse-glimmer) → http://localhost:11434/v1; LM Studio `lms server start` → :1234; llama.cpp `llama serve -hf meta-models/Muse-Glimmer-30B-GGUF --hf-file Muse-Glimmer-30B-KQuant-17GB-Q4_K_M.gguf -a muse-glimmer -ngl 99 -c 131072`; quant doc's pick is Q4_K_M 17GB (needs a big-memory Mac; mmproj vision variant exists but out of scope).
- 2026-10-28 provider choice: Fireworks (user confirmed). OPEN_* = Fireworks base/model; OPEN_API_KEY copied from FIREWORKS_API_KEY into local .env.local only (never printed).
- 2026-10-28 fallback semantics: only non-private calls fall back (Meta 429/5xx → open once). Private apps never fall back: a local failure must not leak to hosted open weights. The open retry drops the caller's Meta model id so OPEN_MODEL applies (matters for suggest's wonder override).
- 2026-10-28 teach/features stays on Meta (Fireworks has no usable vision, per (b)); hear transcription stays on Meta, only the form-fill step goes private; SAM/Image/Voice never fall back.
- 2026-10-28 try-open PASS: open via accounts/fireworks/models/muse-spark-open, 15.1s, zod PASS, {"n":1}; local skipped (LOCAL_* unset). Note: tsx is IPC-blocked in the sandbox, so the run used plain node on a .mts copy; the committed `pnpm run try-open` script is tsx and works outside the sandbox.
