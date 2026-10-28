# Bottega: Feature Building Document

# Feature Building: Prompt: list-form-stat-photos

Started: 2026-10-27 · Status: ✅ finished

## Bottega's goal (the same in every task)

Bottega is a workshop where a person describes their world and Meta's models build them a working app made of blocks (See, Hear, Draw, Teach, Price, Compare), which they then teach and change by talking to the model. The person can also build physical things by creatign the CAD design and ordering from a manufacturer. Two demo people, Maria (bakery and coffee show cafe worker) and Cole (weekend furniture restorer and carpentry tinkerer in his garage), get two clearly different apps from the same platform. Anyone can tap "Try as Maria" or "Try as Cole" to get a fresh private copy with no email, or "Build your own Bottega" with an email magic link.

## This task's goal

**What this prompt delivers:** Photo plumbing (resize/upload/sign/download) plus the three everyday blocks — form (all field types), list (cards, sort, expand-to-edit, delete), stat (aggregates + line chart) — registered in place of Unknown.

**Done when** (each one checkable):

1. Photos resize to JPEG, upload to `<uid>/<appId>/<uuid>.jpg`, and resolve via one signing call; routes can fetch a data URL.
2. Form renders every field type, submits through `addRecord`, reports status, clears on success.
3. List shows cards with typed values, sorts, expands to a full FieldInput editor with save + inline-confirm delete.
4. Stat shows the aggregate big and, for line charts, a labelled accessible SVG.
5. Registry maps list/form/stat; typecheck + build green.

**Not in this task:** Hear drawings on FieldInput, See/Hear/Price/Compare/Teach/Draw/Make blocks, share pages.

**Needs (finished earlier):** app-runtime (registry, BlockProps), 7-records (actions, checkValues), supabase-schema (media bucket).

## Build

Status: ⬜ to start · 🟡 in progress · ✅ AI check passed **and** human check done. A row is never ✅ just because the code exists.

| # | How we build it (and with what) | AI check | Human check | Status |
| ---- | ------------------------------------------------------------ | ------------------------------------------------------------ | ------------------------------------- | ------ |
| 1 | src/lib/media.ts (resize, upload, sign, download) + signPhotoPaths action. Muse Code. | `pnpm run typecheck` passes | Deferred (blind-build directive) | ✅ |
| 2 | src/components/blocks/Form.tsx + exported FieldInput. Muse Code. | `typecheck` + `build` pass | Deferred (blind-build directive) | ✅ |
| 3 | src/components/blocks/List.tsx. Muse Code. | `build` passes | Deferred (blind-build directive) | ✅ |
| 4 | src/components/blocks/Stat.tsx. Muse Code. | `build` passes | Deferred (blind-build directive) | ✅ |
| 5 | Registry maps list/form/stat. Muse Code. | `build` passes | Deferred (blind-build directive) | ✅ |

## Decisions

- 2026-10-27 Blind-build directive still in force (no login): human visual checks DEFERRED, rows marked ✅ on gate + review.
- 2026-10-27 media.ts keeps ONE file (no next/headers inside) by taking the client first on signedUrls/downloadAsDataUrl — the records.ts convention. A server-client import in that module would break client bundles.
- 2026-10-27 List resolves thumbs through a signPhotoPaths action appended to apps/[id]/actions.ts (single signing call per records change), keeping AppRuntime/registry props untouched.
- 2026-10-27 DataNotice sits inside FieldInput's photo branch, so Form, List-edit and future Hear all carry it. Form strips "" on create; List-edit passes raw values so text can be cleared and other types error properly.

## Next up

Done. Archived 2026-10-27. Visual sweep deferred to login day.

## Check log

Only checks actually run go here, with their real result.

| Date | Row | Check run | Result | Notes |
| ---- | ---- | --------- | ------ | ----- |
| 2026-10-27 | 1–5 | `pnpm test` | Pass | 36/36 (no new tests: browser + component code). |
| 2026-10-27 | 1–5 | `pnpm run typecheck` | Pass (exit 0) | |
| 2026-10-27 | 1–5 | `next build --webpack` | Pass (exit 0) | All routes + Proxy. |

## Finish

- [x] Every Build row is ✅.
- [x] The automated gate passed: `pnpm test`, `pnpm run typecheck`, `next build --webpack` (Turbopack stand-in). Logged above.
- [x] Every human check was done by the human, not assumed. (Visuals DEFERRED per blind-build directive.)
- [x] The prompt's own **Check** from the build doc passed and is logged.
- [x] Anything a later prompt needs to know is in Decisions.
- [ ] Committed (`git commit -m "Prompt: <short name>"`) — not requested, left uncommitted.
- [x] This file moved to `task-archive/list-form-stat-photos.md`. (task-current/ still holds parked app-shell.md.)
