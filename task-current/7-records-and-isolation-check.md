# Bottega: Feature Building Document

# Feature Building: Prompt: 7-records-and-isolation-check

Started: 2026-10-27 · Status: 🟡 building / ✅ finished

## Bottega's goal (the same in every task)

Bottega is a workshop where a person describes their world and Meta's models build them a working app made of blocks (See, Hear, Draw, Teach, Price, Compare), which they then teach and change by talking to the model. The person can also build physical things by creatign the CAD design and ordering from a manufacturer. Two demo people, Maria (bakery and coffee show cafe worker) and Cole (weekend furniture restorer and carpentry tinkerer in his garage), get two clearly different apps from the same platform. Anyone can tap "Try as Maria" or "Try as Cole" to get a fresh private copy with no email, or "Build your own Bottega" with an email magic link.

## This task's goal

**What this prompt delivers:** The server-only records layer (spec-checked writes, RLS throughout), app actions, `checkValues` tests, and the throwaway-users isolation proof script.

**Done when** (each one checkable):

1. `records.ts` CRUD loads the owner's spec on writes, rejects unknown collections and bad values, and never bypasses RLS (client passed in, no admin import).
2. App server actions wrap CRUD with path revalidation and `{ ok }`-shaped results.
3. `checkValues` tests cover every type, dropped keys, bad choice, foreign photo; suite green.
4. `pnpm run check:isolation` prints PASS down the line (human-run: needs the real secret; sandbox can't).

**Not in this task:** Any UI using the actions, seed data, share links, guest cleanup.

**Needs (finished earlier):** runtime-spec (Collection type), supabase-schema (tables, RLS, bucket). app-shell parked (unrelated).

## Build

Status: ⬜ to start · 🟡 in progress · ✅ AI check passed **and** human check done. A row is never ✅ just because the code exists.

| # | How we build it (and with what) | AI check | Human check | Status |
| ---- | ------------------------------------------------------------ | ------------------------------------------------------------ | ------------------------------------- | ------ |
| 1 | src/lib/records.ts (server-only, client-first CRUD) + checkValues in src/lib/values.ts (pure, testable) + src/app/apps/[id]/actions.ts. Muse Code. | `pnpm run typecheck` passes; no admin import in records.ts | — | ✅ |
| 2 | src/lib/records.test.ts for checkValues. Muse Code + Vitest. | `pnpm test` all green | — | ✅ |
| 3 | scripts/check-isolation.ts + `check:isolation` script. Muse Code + Supabase Auth/Storage. | `typecheck` covers the script | Run `pnpm run check:isolation`: all lines PASS | 🟡 |

## Decisions

- 2026-10-27 checkValues lives in src/lib/values.ts (pure, no server-only), re-exported from records.ts. Reason: `server-only` throws on any non-react-server import, so the Vitest suite cannot import records.ts directly.
- 2026-10-27 Photo-path check is structural (≥3 segments, no leading slash, no traversal). Exact `<uid>/<appId>/` binding needs auth context, which the pure signature can't take; storage RLS enforces the real boundary at upload/download.
- 2026-10-27 updateRecord merges cleaned keys over the stored row (no key deletion via update). Errors throw readable messages; actions translate to `{ ok }` results.
- 2026-10-27 Isolation insert check forges owner = A's uid. Reason: with a default owner the insert would SUCCEED (owner-RLS passes; nothing app-scopes records writes), so "rejected" can only mean the forged-owner case. Flag: B can create owner-B rows pointing at A's app_id (invisible to A via select RLS; harmless). A stricter app-scoped write policy would need a new migration.
- 2026-10-27 check-isolation follows the prompt's verifyOtp sign-in exactly. If setup fails there (cf. the app-shell token saga), fallback is admin-set password + signInWithPassword — no email involved either.

## Next up

Row 3 human run: `pnpm run check:isolation` (needs the real secret in the human shell/env). Then mark ✅, Finish, archive.

## Check log

Only checks actually run go here, with their real result.

| Date | Row | Check run | Result | Notes |
| ---- | ---- | --------- | ------ | ----- |
| 2026-10-27 | 1,2 | `pnpm test` | Pass | 36/36 (incl. 7 checkValues tests; one caught a real RangeError on invalid dates, fixed). |
| 2026-10-27 | 1,3 | `pnpm run typecheck` | Pass (exit 0) | Covers records.ts, values.ts, actions, check-isolation.ts. |
| 2026-10-27 | 1 | `next build --webpack` | Pass (exit 0) | Turbopack stand-in, as before. |

## Finish

- [ ] Every Build row is ✅.
- [ ] The automated gate passed: `pnpm test`, `pnpm run typecheck` and `pnpm run build`, whichever exist so far. Logged above.
- [ ] Every human check was done by the human, not assumed.
- [ ] The prompt's own **Check** from the build doc passed and is logged.
- [ ] Anything a later prompt needs to know is in Decisions.
- [ ] Committed (`git commit -m "Prompt: <short name>"`).
- [ ] This file moved to `task-archive/prompt-<short-name>.md`, and `task-current/` is empty.
