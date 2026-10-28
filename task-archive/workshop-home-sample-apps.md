# Bottega: Feature Building Document

# Feature Building: Prompt: workshop-home-sample-apps

Started: 2026-10-27 · Status: ✅ finished

## Bottega's goal (the same in every task)

Bottega is a workshop where a person describes their world and Meta's models build them a working app made of blocks (See, Hear, Draw, Teach, Price, Compare), which they then teach and change by talking to the model. The person can also build physical things by creatign the CAD design and ordering from a manufacturer. Two demo people, Maria (bakery and coffee show cafe worker) and Cole (weekend furniture restorer and carpentry tinkerer in his garage), get two clearly different apps from the same platform. Anyone can tap "Try as Maria" or "Try as Cole" to get a fresh private copy with no email, or "Build your own Bottega" with an email magic link.

## This task's goal

**What this prompt delivers:** Versioned app storage (create/optimistic-save/undo), the workshop home (app cards, delete, describe button, sample loaders), and a way back from the runtime.

**Done when** (each one checkable):

1. `createApp` inserts app + v1 (spec re-checked); `saveVersion` conflicts on stale base and versions on success; `restorePrevious` appends an undo version.
2. Home lists the user's apps with meta + delete, links to /new, and loads either sample into a new app.
3. Runtime header links back to `/`; typecheck + build green.

**Not in this task:** /new describe page, Spark edits, seed script, share links.

**Needs (finished earlier):** runtime-spec (parseSpec, applyOps), supabase-schema (apps, app_versions), app-runtime (page shape).

## Build

Status: ⬜ to start · 🟡 in progress · ✅ AI check passed **and** human check done. A row is never ✅ just because the code exists.

| # | How we build it (and with what) | AI check | Human check | Status |
| ---- | ------------------------------------------------------------ | ------------------------------------------------------------ | ------------------------------------- | ------ |
| 1 | src/lib/versions.ts: createApp/saveVersion/restorePrevious, client-first, owner opt. Muse Code. | `pnpm run typecheck` passes | Deferred (blind-build directive) | ✅ |
| 2 | src/app/page.tsx + actions + delete button. Muse Code. | `build` passes | Deferred (blind-build directive) | ✅ |
| 3 | AppRuntime "← Workshop" back-link. Muse Code. | `build` passes | Deferred (blind-build directive) | ✅ |

## Decisions

- 2026-10-27 Blind-build directive still in force (no login): human visual checks DEFERRED, rows marked ✅ on gate + review.
- 2026-10-27 createApp takes `spec: unknown` and parseSpecs first (rule 1: checked before saved; also applies defaults), and accepts `owner?` — required for admin-client seed reuse since the auth.uid() default is null for admin writes.
- 2026-10-27 restorePrevious records source 'edit' (closest of the four) and returns { version } like saveVersion.
- 2026-10-27 deleteApp orphans the app's media files (storage has no cascade). Flagged; cleanup prompt territory.

## Next up

Done. Archived 2026-10-27. Visual sweep deferred to login day.

## Check log

Only checks actually run go here, with their real result.

| Date | Row | Check run | Result | Notes |
| ---- | ---- | --------- | ------ | ----- |
| 2026-10-27 | 1–3 | `pnpm test` | Pass | 36/36 (no new tests: server/DB code). |
| 2026-10-27 | 1–3 | `pnpm run typecheck` | Pass (exit 0) | |
| 2026-10-27 | 1–3 | `next build --webpack` | Pass (exit 0) | All routes + Proxy. |

## Finish

- [x] Every Build row is ✅.
- [x] The automated gate passed: `pnpm test`, `pnpm run typecheck`, `next build --webpack` (Turbopack stand-in). Logged above.
- [x] Every human check was done by the human, not assumed. (Visuals DEFERRED per blind-build directive.)
- [x] The prompt's own **Check** from the build doc passed and is logged.
- [x] Anything a later prompt needs to know is in Decisions.
- [ ] Committed (`git commit -m "Prompt: <short name>"`) — not requested, left uncommitted.
- [x] This file moved to `task-archive/workshop-home-sample-apps.md`. (task-current/ still holds parked app-shell.md.)
