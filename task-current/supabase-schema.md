# Bottega: Feature Building Document

# Feature Building: Prompt: Supabase schema

Started: 2026-10-27 · Status: 🟡 building / ✅ finished

## Bottega's goal (the same in every task)

Bottega is a workshop where a person describes their world and Meta's models build them a working app made of blocks (See, Hear, Draw, Teach, Price, Compare), which they then teach and change by talking to the model. The person can also build physical things by creatign the CAD design and ordering from a manufacturer. Two demo people, Maria (bakery and coffee show cafe worker) and Cole (weekend furniture restorer and carpentry tinkerer in his garage), get two clearly different apps from the same platform. Anyone can tap "Try as Maria" or "Try as Cole" to get a fresh private copy with no email, or "Build your own Bottega" with an email magic link.

## This task's goal

**What this prompt delivers:** Supabase wired up — packages, initial migration (tables + RLS + media bucket) applied to the linked project, browser/server/admin clients, session refresh per the Next 16 convention, `db:push`/`db:types` scripts and generated types.

**Done when** (each one checkable):

1. Confirmations (a) proxy-vs-middleware and (b) injected env var names are reported, and §5 of Bottega Components.md is read.
2. `@supabase/supabase-js`, `@supabase/ssr`, `supabase` CLI and `server-only` are installed with exact pins.
3. Migration `0001_init.sql` is applied to the linked project (tables, RLS policies, media bucket all present).
4. Clients + session refresh exist per the Next 16 convention; `pnpm run typecheck` passes.
5. `db:push` / `db:types` scripts exist and `src/lib/supabase/types.ts` is generated from the live schema.

**Not in this task:** Auth UI, magic links, Try-as, seed data, storage uploads, or any table beyond §5.

**Needs (finished earlier):** setup (toolchain), brain-engine (unrelated, done).

## Build

Status: ⬜ to start · 🟡 in progress · ✅ AI check passed **and** human check done. A row is never ✅ just because the code exists.

| # | How we build it (and with what) | AI check | Human check | Status |
| ---- | ------------------------------------------------------------ | ------------------------------------------------------------ | ------------------------------------- | ------ |
| 1 | Confirm (a) Next 16 proxy/middleware convention from the docs and (b) Supabase var names in .env.local; read Bottega Components.md §5. | Findings recorded below + reported | — | ✅ |
| 2 | Install @supabase/supabase-js 2.118.0, @supabase/ssr 0.12.7, supabase CLI 2.122.0 (dev), server-only 0.0.1 (exact pins). Muse Code + pnpm. | `pnpm ls` shows exact versions | — | ✅ |
| 3 | supabase/migrations/0001_init.sql per §5; link project; `db:push` applies it. Supabase CLI. | Tables/policies/bucket verified on the linked project | Pull `.env.local` + link project (human; CLI needs access token + DB password) | 🟡 |
| 4 | src/lib/supabase/{browser,server,admin}.ts + `src/proxy.ts` session refresh, matching app routes only. Muse Code. | `pnpm run typecheck` passes | — (waits on row 3 env names) | ⬜ |
| 5 | package.json `db:push`/`db:types` (added); generate src/lib/supabase/types.ts. Supabase CLI. | types.ts exists and matches live schema | — (waits on row 3 link) | 🟡 |

## Decisions

- 2026-10-27 (a) Next.js 16 renamed `middleware.ts` → `src/proxy.ts` (`export function proxy`); confirmed in the Next 16 docs and in installed next@16.4.3 (`PROXY_FILENAME`, `ProxyConfig.matchers`). Session refresh goes in `src/proxy.ts`.
- 2026-10-27 (b) BLOCKED: no `.env.local` and no `.vercel/` linkage in the repo, so the injected Supabase var names are unknown. Waiting on the human to run `vercel env pull .env.local`.
- 2026-10-27 "Bottega Components.md" does not exist in the repo (no file matches, nothing references `app_versions`). The migration is written from the prompt's inline §5 spec, which is fully detailed.
- 2026-10-27 Exact pins looked up: @supabase/supabase-js 2.118.0, @supabase/ssr 0.12.7, supabase 2.122.0, server-only 0.0.1.

## Next up

Human (in their own terminal — both CLIs are sandbox-blocked here, and link/push need their credentials): `vercel env pull .env.local`, `supabase link`, `pnpm db:push`, `pnpm db:types`. Then rows 3–5 unblock: verify applied schema, write clients with the real var names, confirm types.ts.

## Check log

Only checks actually run go here, with their real result.

| Date | Row | Check run | Result | Notes |
| ---- | ---- | --------- | ------ | ----- |
| 2026-10-27 | 2 | `pnpm add` supabase-js, ssr, server-only, supabase CLI | Pass | Exact pins verified in package.json; CLI download took ~15 min through the flaky proxy (2 retries). |
| 2026-10-27 | 3 | `supabase --version` (homebrew) in sandbox | Blocked | Binary killed on launch (signal 9) — sandbox restriction, not a broken install. |
| 2026-10-27 | 3 | `pnpm exec supabase --version` with real vs temp HOME | Pass with temp HOME | Real HOME: telemetry write EPERM crash. `HOME=/tmp/sb-home`: prints 2.122.0. CLI is fine; sandbox blocks `~/.supabase` writes. |

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
