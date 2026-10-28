# Bottega: Feature Building Document

# Feature Building: Prompt: edit-ops

Started: 2026-10-27 · Status: ✅ finished

## Bottega's goal (the same in every task)

Bottega is a workshop where a person describes their world and Meta's models build them a working app made of blocks (See, Hear, Draw, Teach, Price, Compare), which they then teach and change by talking to the model. The person can also build physical things by creatign the CAD design and ordering from a manufacturer. Two demo people, Maria (bakery and coffee show cafe worker) and Cole (weekend furniture restorer and carpentry tinkerer in his garage), get two clearly different apps from the same platform. Anyone can tap "Try as Maria" or "Try as Cole" to get a fresh private copy with no email, or "Build your own Bottega" with an email magic link.

## This task's goal

**What this prompt delivers:** `src/lib/spec/ops.ts` — the Zod op union and `applyOps` (clone, ordered apply, op-indexed errors, parse re-check) — plus a test suite proving edits and failures against the fixtures.

**Done when** (each one checkable):

1. All 10 op types validate; `applyOps` never mutates its input, names the op index on errors, forbids id/type changes, and rejects an empty list.
2. The result of any successful `applyOps` passes `parseSpec`; dangling refs fail with spec paths.
3. `pnpm test` and `pnpm run typecheck` green.

**Not in this task:** Spark emitting ops, version storage, app_versions rows, runtime rendering.

**Needs (finished earlier):** runtime-spec (schema, fixtures, parseSpec). app-shell parked (unrelated).

## Build

Status: ⬜ to start · 🟡 in progress · ✅ AI check passed **and** human check done. A row is never ✅ just because the code exists.

| # | How we build it (and with what) | AI check | Human check | Status |
| ---- | ------------------------------------------------------------ | ------------------------------------------------------------ | ------------------------------------- | ------ |
| 1 | src/lib/spec/ops.ts: op union, applyOps; export subschemas + path formatter from schema.ts. Muse Code. | `pnpm test` + `pnpm run typecheck` pass | — | ✅ |
| 2 | src/lib/spec/ops.test.ts: 3 pass cases + 6 fail cases + immutability, on both fixtures. Muse Code + Vitest. | `pnpm test` all green | — | ✅ |

## Decisions

- 2026-10-27 "Bottega Components.md" still does not exist in the repo. The prompt's inline spec is fully detailed and treated as authoritative.
- 2026-10-27 Every op carries an "op" discriminator (e.g. `{ op: "removeBlock", id }`). Without it removeScreen and removeBlock share the identical `{ id }` shape and can't be told apart — and the required `ops[2] (removeBlock): …` error format needs the op name at runtime.
- 2026-10-27 Validation split: op schemas check shape (right fields, right primitives); parseSpec re-check enforces limits and refs afterward. Only checks the schema can't express live in apply: missing targets, id/type changes, duplicate field ids, index bounds.

## Next up

Done. Archived 2026-10-27; no human check needed (pure logic, fully covered by tests).

## Check log

Only checks actually run go here, with their real result.

| Date | Row | Check run | Result | Notes |
| ---- | ---- | --------- | ------ | ----- |
| 2026-10-27 | 1,2 | `pnpm test` | Pass | 29/29 (9 brain + 11 schema + 9 ops). |
| 2026-10-27 | 1 | `pnpm run typecheck` | Pass (exit 0) | |
| 2026-10-27 | 1 | `next build --webpack` | Pass (exit 0) | Turbopack stand-in, as before. |

## Finish

- [x] Every Build row is ✅.
- [x] The automated gate passed: `pnpm test`, `pnpm run typecheck`, `next build --webpack` (Turbopack stand-in). Logged above.
- [x] Every human check was done by the human, not assumed. (No human check on any row: pure logic, fully covered by tests.)
- [x] The prompt's own **Check** from the build doc passed and is logged.
- [x] Anything a later prompt needs to know is in Decisions.
- [ ] Committed (`git commit -m "Prompt: <short name>"`) — not requested, left uncommitted.
- [x] This file moved to `task-archive/edit-ops.md`. (task-current/ still holds parked app-shell.md.)
