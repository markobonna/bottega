# Bottega: Feature Building Document

# Feature Building: Prompt: 1 scaffold

Started: 2026-10-27 · Status: ✅ finished

## Bottega's goal (the same in every task)

Bottega is a workshop where a person describes their world and Meta's models build them a working app made of blocks (See, Hear, Draw, Teach, Price, Compare), which they then teach and change by talking to the model. The person can also build physical things by creatign the CAD design and ordering from a manufacturer. Two demo people, Maria (bakery and coffee show cafe worker) and Cole (weekend furniture restorer and carpentry tinkerer in his garage), get two clearly different apps from the same platform. Anyone can tap "Try as Maria" or "Try as Cole" to get a fresh private copy with no email, or "Build your own Bottega" with an email magic link.

## This task's goal

**What this prompt delivers:** Pinned toolchain plus configs, the full light/dark token theme, and a placeholder home page; `typecheck` and `build` pass.

**Done when** (each one checkable):

1. `pnpm install` succeeds with every version pinned exactly (no `^`).
2. `pnpm run typecheck` and `pnpm run build` pass.
3. The vitest config loads (no test files exist yet; verified with `--passWithNoTests`).
4. The home page shows "Your workshop." in the display font at 390 px, light and dark, no horizontal scroll.

**Not in this task:** Anything beyond the scaffold: spec schema/ops, Supabase, Meta client, runtime, blocks, workshop pages, seed data.

**Needs (finished earlier):** None (first prompt).

## Build

Status: ⬜ to start · 🟡 in progress · ✅ AI check passed **and** human check done. A row is never ✅ just because the code exists.

| # | How we build it (and with what) | AI check | Human check | Status |
| ---- | ------------------------------------------------------------ | ------------------------------------------------------------ | ------------------------------------- | ------ |
| 1 | package.json: scripts dev/build/start/test/typecheck, engines node >=20.9, packageManager ppnpm@12.15.0, exact pins (next 16.4.3, react/react-dom 19.3.1, typescript 5.9.3, tailwindcss + @tailwindcss/postcss 4.3.3, vitest 5.0.5, @types/react + @types/react-dom 19.3.0, @types/node 22.20.5, zod 4.6.7). Muse Code + ppnpm. | `ppnpm install` exit 0; `ppnpm ls` shows pinned versions | — | ✅ |
| 2 | Configs: tsconfig.json, next.config.ts, postcss.config.mjs, vitest.config.mts, .env.example, .gitignore gains scripts/demo-photos/. Muse Code. | `ppnpm run typecheck` passes; `vitest run --passWithNoTests` loads config | — | ✅ |
| 3 | Theme: src/app/globals.css (tokens, @theme inline map, gutter, base, dial-in/plain-in/checker), src/lib/accents.ts (ACCENTS). Muse Code. | `next build` passes (Tailwind compiles) | — | ✅ |
| 4 | src/app/layout.tsx (Fraunces + Atkinson, metadata, viewport) and src/app/page.tsx ("Your workshop."). Muse Code. | Build passes; prerendered HTML contains "Your workshop." | Open localhost:3000 (`pnpm dev`): heading in display font, 390 px light + dark, no h-scroll | ✅ |

## Decisions

- 2026-10-27 Package manager is ppnpm (human instruction mid-task). Removed the pnpm install (node_modules, package-lock.json), reinstalled with ppnpm 12.15.0, added `"packageManager": "pnpm@12.15.0"`. Lockfile is pnpm-lock.yaml.
- 2026-10-27 Default `next build` (Turbopack) cannot run in this sandbox: its loader subprocess dies with "binding to a port / Operation not permitted". Verified the build gate with `next build --webpack` instead (exit 0, `/` prerendered). The `build` script stays `next build`; run it unsandboxed for the real gate.
- 2026-10-27 `next build` auto-added `.next/dev/types/**/*.ts` to tsconfig include (Next's own rewrite, kept).
- 2026-10-27 Build prints "Failed to find font override values for font Atkinson Hyperlegible Next" (non-fatal; no automatic fallback metrics, real font still loads).

## Next up

Done. Archived 2026-10-27; human confirmed row 4 passed.

## Check log

Only checks actually run go here, with their real result.

| Date | Row | Check run | Result | Notes |
| ---- | ---- | --------- | ------ | ----- |
| 2026-10-27 | 1 | `pnpm install` | Pass (exit 0) | First attempt hit a dead-proxy tunnel error; retry succeeded. |
| 2026-10-27 | 1 | `pnpm ls --depth=0` | Pass | All 11 versions exactly as pinned, no `^`. |
| 2026-10-27 | 2 | `pnpm run typecheck` | Pass (exit 0) | |
| 2026-10-27 | 2 | `vitest run --passWithNoTests` | Pass (exit 0) | Config loads; no test files yet, as expected. Plain `pnpm test` would exit 1 until the first test file lands. |
| 2026-10-27 | 3,4 | `next build --webpack` | Pass (exit 0) | Stand-in for `next build`: Turbopack subprocess is sandbox-blocked. Non-fatal Atkinson override warning. |
| 2026-10-27 | 4 | `grep "Your workshop." .next/server/app/index.html` | Pass | Heading present in prerendered HTML (twice: title + h1). |

## Finish

- [x] Every Build row is ✅.
- [x] The automated gate passed: `pnpm run typecheck` and `next build --webpack` (Turbopack stand-in; see Decisions). Logged above. (`pnpm test` had no test files yet; config verified with `--passWithNoTests`.)
- [x] Every human check was done by the human, not assumed.
- [x] The prompt's own **Check** from the build doc passed and is logged.
- [x] Anything a later prompt needs to know is in Decisions.
- [ ] Committed (`git commit -m "Prompt: <short name>"`) — not requested, left uncommitted.
- [x] This file moved to `task-archive/setup.md`, and `task-current/` is empty.
