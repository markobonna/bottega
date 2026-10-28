# Bottega: Feature Building Document

# Feature Building: Prompt: runtime-spec

Started: 2026-10-27 · Status: ✅ finished

## Bottega's goal (the same in every task)

Bottega is a workshop where a person describes their world and Meta's models build them a working app made of blocks (See, Hear, Draw, Teach, Price, Compare), which they then teach and change by talking to the model. The person can also build physical things by creatign the CAD design and ordering from a manufacturer. Two demo people, Maria (bakery and coffee show cafe worker) and Cole (weekend furniture restorer and carpentry tinkerer in his garage), get two clearly different apps from the same platform. Anyone can tap "Try as Maria" or "Try as Cole" to get a fresh private copy with no email, or "Build your own Bottega" with an email magic link.

## This task's goal

**What this prompt delivers:** `src/lib/spec/schema.ts` — the Zod 4 AppSpec contract (limits + cross-checks + `parseSpec`) — plus the Maria and Cole fixtures and a test suite proving both the happy paths and the failure paths.

**Done when** (each one checkable):

1. `schema.ts` implements the full contract: 10 block types, id/label/count limits, superRefine cross-checks, typed `parseSpec` with `screens[1].blocks[0].collection`-style issues.
2. Both fixtures parse, share no screen titles, and have different block layouts.
3. All seven specified failure cases fail with the right paths; `pnpm test` and `pnpm run typecheck` green.

**Not in this task:** Spec ops/diffs, runtime rendering, seed data, Supabase writes.

**Needs (finished earlier):** setup, supabase-schema. app-shell parked (unrelated).

## Build

Status: ⬜ to start · 🟡 in progress · ✅ AI check passed **and** human check done. A row is never ✅ just because the code exists.

| # | How we build it (and with what) | AI check | Human check | Status |
| ---- | ------------------------------------------------------------ | ------------------------------------------------------------ | ------------------------------------- | ------ |
| 1 | src/lib/spec/schema.ts: Zod 4 AppSpec, limits, superRefine, parseSpec, exported types. Muse Code. | `pnpm test` + `pnpm run typecheck` pass | — | ✅ |
| 2 | src/lib/spec/fixtures/{maria,cole}.json per spec. Muse Code. | Both parse in tests; titles + layouts differ | — | ✅ |
| 3 | src/lib/spec/schema.test.ts: parse/diff + 7 failure-path cases. Muse Code + Vitest. | `pnpm test` all green | — | ✅ |

## Decisions

- 2026-10-27 "Bottega Components.md" still does not exist in the repo (see supabase-schema archive). The prompt's inline §2 spec is fully detailed and treated as authoritative.
- 2026-10-27 String-length calls: nouns/options/units/question treated as labels (1..40); hear + dims hints 1..120; tagline 1..80; promptTemplate 1..300. Cole's quote block omits `currency` to exercise the USD default. Cole's 🖼️ icon replaced with 📸 (the former is two code points, failing the single-emoji rule).
- 2026-10-27 Zod 4 runs superRefine even when nested schema issues exist, so one bad spec can yield several issues; the uppercase-id test pins both. Issue paths can contain symbols, so formatPath accepts PropertyKey.

## Next up

Done. Archived 2026-10-27; no human check needed (pure logic, fully covered by tests).

## Check log

Only checks actually run go here, with their real result.

| Date | Row | Check run | Result | Notes |
| ---- | ---- | --------- | ------ | ----- |
| 2026-10-27 | 1–3 | `pnpm test` | Pass | 20/20 (9 brain + 11 spec): fixtures parse, titles/layouts differ, 7 failure paths exact. |
| 2026-10-27 | 1 | `pnpm run typecheck` | Pass (exit 0) | |
| 2026-10-27 | 1 | `next build --webpack` | Pass (exit 0) | Turbopack stand-in, as before. |

## Finish

- [x] Every Build row is ✅.
- [x] The automated gate passed: `pnpm test`, `pnpm run typecheck`, `next build --webpack` (Turbopack stand-in). Logged above.
- [x] Every human check was done by the human, not assumed. (No human check on any row: pure logic, fully covered by tests.)
- [x] The prompt's own **Check** from the build doc passed and is logged.
- [x] Anything a later prompt needs to know is in Decisions.
- [ ] Committed (`git commit -m "Prompt: <short name>"`) — not requested, left uncommitted.
- [x] This file moved to `task-archive/runtime-spec.md`. (task-current/ still holds parked app-shell.md.)
