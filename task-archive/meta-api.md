# Bottega: Feature Building Document

# Feature Building: Prompt: meta-api

Started: 2026-10-27 · Status: 🟡 building / ✅ finished

## Bottega's goal (the same in every task)

Bottega is a workshop where a person describes their world and Meta's models build them a working app made of blocks (See, Hear, Draw, Teach, Price, Compare), which they then teach and change by talking to the model. The person can also build physical things by creatign the CAD design and ordering from a manufacturer. Two demo people, Maria (bakery and coffee show cafe worker) and Cole (weekend furniture restorer and carpentry tinkerer in his garage), get two clearly different apps from the same platform. Anyone can tap "Try as Maria" or "Try as Cole" to get a fresh private copy with no email, or "Build your own Bottega" with an email magic link.

## This task's goal

**What this prompt delivers:** The server-side Meta API layer — `meta.ts` (key/config, chat, structured JSON, post helpers, typed errors), `api.ts` (auth gate, error translation, body validation), and mocked-fetch tests.

**Done when** (each one checkable):

1. The `-contributor` id confirmation is attempted and reported; defaults updated iff they exist.
2. `meta.ts` implements the contract (never logs the key, no custom User-Agent, Bearer auth, timeouts, 300-char details).
3. `api.ts` gates (401), translates (503 off / 502), and validates bodies (400 + first issue).
4. `meta.test.ts` covers the four specified cases green; typecheck green.

**Not in this task:** image(), transcribe(), sam() (later prompts), private-mode switching (Prompt 26), any route using these.

**Needs (finished earlier):** setup (.env.example). app-shell parked (unrelated).

## Build

Status: ⬜ to start · 🟡 in progress · ✅ AI check passed **and** human check done. A row is never ✅ just because the code exists.

| # | How we build it (and with what) | AI check | Human check | Status |
| ---- | ------------------------------------------------------------ | ------------------------------------------------------------ | ------------------------------------- | ------ |
| 1 | Confirm -contributor ids via GET {base}/models; report; update defaults iff present. curl. | Findings recorded + reported | Provide MODEL_API_KEY (absent everywhere) | ✅ |
| 2 | src/lib/meta.ts per contract. Muse Code. | `pnpm test` + `typecheck` pass; no key logging, no UA | — | ✅ |
| 3 | src/lib/api.ts per contract. Muse Code. | `typecheck` passes | — | ✅ |
| 4 | src/lib/meta.test.ts (mocked fetch, 4 cases). Muse Code + Vitest. | `pnpm test` all green | — | ✅ |

## Decisions

- 2026-10-27 "Bottega Components.md" (§4) and old-idea/tiny-brain still do not exist. The prompt's inline spec is fully detailed and treated as authoritative; no spark() exists in it, so none is written (chat() with the SPARK_MODEL default is the Spark caller).
- 2026-10-27 Row 1 BLOCKED: no MODEL_API_KEY in .env.local, shell env, or .env.example. Unauthenticated GET /models returns OpenAI-style 401 (endpoint exists, speaks {"error":{"code":"invalid_api_key",...}}). -contributor existence unverifiable → standard ids stay as defaults; rerun when the key exists.
- 2026-10-27 Gate green: pnpm test 40/40, typecheck exit 0, next build --webpack exit 0. Impl notes: reasoning sent as literal `reasoning` body field; timeout → ModelError(504), bad-json/empty-reply → ModelError(502); postJson/postForm return raw Response for later image()/transcribe()/sam(); meta.test.ts mocks 'server-only' (it throws on plain import) + global fetch.
- 2026-10-27 Added empty FIREWORKS_/BASETEN_/MODAL_ key slots to .env.example (credits pending, no code reads them yet). Keys policy: source of truth is Vercel env vars, pulled with `vercel env pull .env.local`; never NEXT_PUBLIC_, never commit values.
- 2026-10-27 Row 1 DONE: GET /models lists muse-spark-1.3-contributor (exact) but no wonder -contributor. SPARK_MODEL default → muse-spark-1.3-contributor in .env.example, .env.local, and meta.ts code fallback; WONDER stays standard. Also observed sam-3.1, muse-image-1.0, muse-voice-transcribe-1.0 (SAM_MODEL still left for its prompt). Stripped double quotes around MODEL_API_KEY in .env.local (dotenv tolerated them; raw readers 401'd).

## Next up

Row 1: run the -contributor confirmation.

## Check log

Only checks actually run go here, with their real result.

| Date | Row | Check run | Result | Notes |
| ---- | ---- | --------- | ------ | ----- |

## Finish

- [ ] Every Build row is ✅.
- [ ] The automated gate passed: `pnpm test`, `pnpm run typecheck` and `pnpm run build`, whichever exist so far. Logged above.
- [ ] Every human check was done by the human, not assumed.
- [ ] The prompt's own **Check** from the build doc passed and is logged.
- [ ] Anything a later prompt needs to know is in Decisions.
- [ ] Committed (`git commit -m "Prompt: <short name>"`).
- [ ] This file moved to `task-archive/prompt-<short-name>.md`, and `task-current/` is empty.
