# Bottega: Feature Building Document

# Feature Building: Prompt: brain engine

Started: 2026-10-27 · Status: ✅ finished

## Bottega's goal (the same in every task)

Bottega is a workshop where a person describes their world and Meta's models build them a working app made of blocks (See, Hear, Draw, Teach, Price, Compare), which they then teach and change by talking to the model. The person can also build physical things by creatign the CAD design and ordering from a manufacturer. Two demo people, Maria (bakery and coffee show cafe worker) and Cole (weekend furniture restorer and carpentry tinkerer in his garage), get two clearly different apps from the same platform. Anyone can tap "Try as Maria" or "Try as Cole" to get a fresh private copy with no email, or "Build your own Bottega" with an email magic link.

## This task's goal

**What this prompt delivers:** `src/lib/brain.ts`, a pure N-input (2–6) logistic-regression brain generalized from Tiny Brain, plus `src/lib/brain.math.test.ts` proving the math.

**Done when** (each one checkable):

1. `src/lib/brain.ts` implements the full prompt contract (LR, LIM, types, create/score/train/answer/words/pct/snapshot) with no React, DOM or network.
2. `pnpm test` passes, covering all seven specified cases (sigmoid, N = 2/4/6 convergence, clamp, conf floor, throw on bad length, snapshot round-trip).
3. `pnpm run typecheck` passes.

**Not in this task:** Teach block UI, dials, the models table, or anything that stores/transmits a brain — just the pure module and its tests.

**Needs (finished earlier):** setup (toolchain, vitest config).

## Build

Status: ⬜ to start · 🟡 in progress · ✅ AI check passed **and** human check done. A row is never ✅ just because the code exists.

| # | How we build it (and with what) | AI check | Human check | Status |
| ---- | ------------------------------------------------------------ | ------------------------------------------------------------ | ------------------------------------- | ------ |
| 1 | src/lib/brain.ts: pure logistic regression, N = 2..6 inputs, bias, clamp, batch training, snapshot/restore. Muse Code. | `pnpm test` passes; `pnpm run typecheck` passes | — | ✅ |
| 2 | src/lib/brain.math.test.ts: the seven specified Vitest cases (+ createBrain bounds). Muse Code + Vitest. | `pnpm test` passes (all cases green) | — | ✅ |

## Decisions

- 2026-10-27 `old-idea/tiny-brain/src/lib/brain.ts` does not exist in the repo or beside it, so brain.ts is a clean-room implementation of the prompt's contract, not a port. Flagging in case the Tiny Brain source should be checked in later.

## Next up

Done. Archived 2026-10-27; no human check needed (pure logic, fully covered by tests).

## Check log

Only checks actually run go here, with their real result.

| Date | Row | Check run | Result | Notes |
| ---- | ---- | --------- | ------ | ----- |
| 2026-10-27 | 1,2 | `pnpm test` | Pass | 9/9: sigmoid, N = 2/4/6 convergence + falling curve, clamp incl. rail saturation, conf floor, prob throw, createBrain bounds, snapshot round-trip. |
| 2026-10-27 | 1 | `pnpm run typecheck` | Pass (exit 0) | |
| 2026-10-27 | 1 | `next build --webpack` | Pass (exit 0) | Stand-in for `next build` (Turbopack subprocess is sandbox-blocked, see setup archive). |

## Finish

- [x] Every Build row is ✅.
- [x] The automated gate passed: `pnpm test`, `pnpm run typecheck`, `next build --webpack` (Turbopack stand-in). Logged above.
- [x] Every human check was done by the human, not assumed. (No human check on either row: pure logic, fully covered by tests.)
- [x] The prompt's own **Check** from the build doc passed and is logged.
- [x] Anything a later prompt needs to know is in Decisions.
- [ ] Committed (`git commit -m "Prompt: <short name>"`) — not requested, left uncommitted.
- [x] This file moved to `task-archive/brain-engine.md`, and `task-current/` is empty.
