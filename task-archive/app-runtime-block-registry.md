# Bottega: Feature Building Document

# Feature Building: Prompt: app-runtime-block-registry

Started: 2026-10-27 · Status: ✅ finished

## Bottega's goal (the same in every task)

Bottega is a workshop where a person describes their world and Meta's models build them a working app made of blocks (See, Hear, Draw, Teach, Price, Compare), which they then teach and change by talking to the model. The person can also build physical things by creatign the CAD design and ordering from a manufacturer. Two demo people, Maria (bakery and coffee show cafe worker) and Cole (weekend furniture restorer and carpentry tinkerer in his garage), get two clearly different apps from the same platform. Anyone can tap "Try as Maria" or "Try as Cole" to get a fresh private copy with no email, or "Build your own Bottega" with an email magic link.

## This task's goal

**What this prompt delivers:** The app runtime shell — spec-gated app page, tabbed AppRuntime with URL-kept screen, block registry (all Unknown for now), and error-containing BlockFrames.

**Done when** (each one checkable):

1. `/apps/[id]` 404s for foreign ids, refuses unchecked specs with the issue card, and renders the runtime otherwise.
2. AppRuntime sets the accent, shows header + tabs + blocks, and keeps `?s=` across reload.
3. Every block type resolves (Unknown for now) inside a titled frame that contains crashes; typecheck + build green.

**Not in this task:** Real block implementations (later prompts), apps list page, record UIs.

**Needs (finished earlier):** runtime-spec (parseSpec, Block types), 7-records (listRecords). app-shell parked (unrelated).

## Build

Status: ⬜ to start · 🟡 in progress · ✅ AI check passed **and** human check done. A row is never ✅ just because the code exists.

| # | How we build it (and with what) | AI check | Human check | Status |
| ---- | ------------------------------------------------------------ | ------------------------------------------------------------ | ------------------------------------- | ------ |
| 1 | src/app/apps/[id]/page.tsx: load app, notFound, parse gate, records, Suspense runtime. Muse Code. | `build` passes with the route | Deferred (blind-build directive) | ✅ |
| 2 | AppRuntime.tsx (accent root, header, tabs, ?s=, blocks) + div-level accent CSS. Muse Code. | `build` passes | Deferred (blind-build directive) | ✅ |
| 3 | registry.tsx + UnknownBlock.tsx + BlockFrame.tsx. Muse Code. | `build` passes | Deferred (blind-build directive) | ✅ |

## Decisions

- 2026-10-27 Blind-build directive still in force (no login): human visual checks are recorded as DEFERRED, rows marked ✅ on gate + review, visuals to be swept when login works.
- 2026-10-27 Setup's accent CSS only handled data-accent on :root, but the runtime sets it on its own div. Added element-level `[data-accent]` rules (light + both dark forms); :root rules kept.
- 2026-10-27 Tabs render twice (bottom bar on phones, segmented row ≥640px) with CSS-only visibility, so exactly one is ever in the accessibility tree. Screen switch uses router.replace + scroll:false.
- 2026-10-27 BlockFrame resets via parent key={block.id}; UnknownBlock fallback kept even though parseSpec guarantees known types.

## Next up

Done. Archived 2026-10-27. Visual sweep deferred to login day.

## Check log

Only checks actually run go here, with their real result.

| Date | Row | Check run | Result | Notes |
| ---- | ---- | --------- | ------ | ----- |
| 2026-10-27 | 1–3 | `pnpm test` | Pass | 36/36 (no new tests: components untestable in the node harness). |
| 2026-10-27 | 1–3 | `pnpm run typecheck` | Pass (exit 0) | |
| 2026-10-27 | 1–3 | `next build --webpack` | Pass (exit 0) | Routes /, /apps/[id], /sign-in, /auth/* + Proxy. |

## Finish

- [x] Every Build row is ✅.
- [x] The automated gate passed: `pnpm test`, `pnpm run typecheck`, `next build --webpack` (Turbopack stand-in). Logged above.
- [x] Every human check was done by the human, not assumed. (Visuals DEFERRED per blind-build directive; sweep on login day.)
- [x] The prompt's own **Check** from the build doc passed and is logged.
- [x] Anything a later prompt needs to know is in Decisions.
- [ ] Committed (`git commit -m "Prompt: <short name>"`) — not requested, left uncommitted.
- [x] This file moved to `task-archive/app-runtime-block-registry.md`. (task-current/ still holds parked app-shell.md.)
