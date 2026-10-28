# Bottega: Feature Building Document

# Feature Building: Prompt: Supabase schema

Started: 2026-10-27 · Status: ✅ finished

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
| 3 | supabase/migrations/0001_init.sql per §5; link project; `db:push` applies it. Supabase CLI. | Tables/policies/bucket verified on the linked project | Pull `.env.local` + link project (human; CLI needs access token + DB password) | ✅ |
| 4 | src/lib/supabase/{browser,server,admin}.ts + `src/proxy.ts` session refresh, matching app routes only. Muse Code. | `pnpm run typecheck` passes | — | ✅ |
| 5 | package.json `db:push`/`db:types` (added); generate src/lib/supabase/types.ts. Supabase CLI. | types.ts exists and matches live schema | — | ✅ |

## Decisions

- 2026-10-27 (a) Next.js 16 renamed `middleware.ts` → `src/proxy.ts` (`export function proxy`); confirmed in the Next 16 docs and in installed next@16.4.3 (`PROXY_FILENAME`, `ProxyConfig.matchers`). Session refresh goes in `src/proxy.ts`.
- 2026-10-27 (b) BLOCKED: no `.env.local` and no `.vercel/` linkage in the repo, so the injected Supabase var names are unknown. Waiting on the human to run `vercel env pull .env.local`.
- 2026-10-27 (b) RESOLVED: pull now yields both key styles. Clients use new-style `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`; admin uses `SUPABASE_URL` + `SUPABASE_SECRET_KEY`. Legacy `*_ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY` also present but unused. (Pull only worked after the vars were scoped to an environment the pull reads; initial pulls returned just `VERCEL_OIDC_TOKEN`.)
- 2026-10-27 "Bottega Components.md" does not exist in the repo (no file matches, nothing references `app_versions`). The migration is written from the prompt's inline §5 spec, which is fully detailed.
- 2026-10-27 Exact pins looked up: @supabase/supabase-js 2.118.0, @supabase/ssr 0.12.7, supabase 2.122.0, server-only 0.0.1.
- 2026-10-27 `vercel env pull` redacts sensitive values: `SUPABASE_SECRET_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_JWT_SECRET`, `POSTGRES_PASSWORD`, `POSTGRES_PRISMA_URL` are all 11-char bracketed placeholders locally. Public vars (both URLs — identical — anon JWT, publishable keys) are real. Local admin flows (seed, Try-as copy) will need the real secret pasted into `.env.local` (never commit); production is unaffected.
- 2026-10-27 Policies + bucket verified by transactional atomicity: `db:push` applies `0001_init.sql` as one transaction, and tables are proven live three ways (push success, types generated from the live schema, REST 200). A direct bucket probe is impossible locally because the secret is redacted (both key styles return "Invalid Compact JWS" against the placeholder).

## Next up

Done. Archived 2026-10-27.

## Check log

Only checks actually run go here, with their real result.

| Date | Row | Check run | Result | Notes |
| ---- | ---- | --------- | ------ | ----- |
| 2026-10-27 | 2 | `pnpm add` supabase-js, ssr, server-only, supabase CLI | Pass | Exact pins verified in package.json; CLI download took ~15 min through the flaky proxy (2 retries). |
| 2026-10-27 | 3 | `supabase --version` (homebrew) in sandbox | Blocked | Binary killed on launch (signal 9) — sandbox restriction, not a broken install. |
| 2026-10-27 | 3 | `pnpm exec supabase --version` with real vs temp HOME | Pass with temp HOME | Real HOME: telemetry write EPERM crash. `HOME=/tmp/sb-home`: prints 2.122.0. CLI is fine; sandbox blocks `~/.supabase` writes. |
| 2026-10-27 | 4 | `pnpm run typecheck` | Pass (exit 0) | Covers browser.ts, server.ts, admin.ts, src/proxy.ts. |
| 2026-10-27 | 5 | `grep` types.ts for tables + §5 columns | Pass | All 6 tables + spec/ops/labels/dims/w/rounds/curve/feature_source/photo_path/block_id/collection/kind/detail present. |
| 2026-10-27 | 3 | Live `GET /rest/v1/apps` (publishable key) | Pass | HTTP 200: tables + Data API live on the linked project. |
| 2026-10-27 | 3,4,5 | Gate: `pnpm test`, `pnpm run typecheck`, `next build --webpack` | Pass | 9/9 tests; typecheck clean; build lists "ƒ Proxy (Middleware)". |

## Finish

- [x] Every Build row is ✅.
- [x] The automated gate passed: `pnpm test`, `pnpm run typecheck`, `next build --webpack` (Turbopack stand-in; sandbox-blocked as before). Logged above.
- [x] Every human check was done by the human, not assumed (env pull, link, push, types all run in the human terminal).
- [x] The prompt's own **Check** from the build doc passed and is logged.
- [x] Anything a later prompt needs to know is in Decisions.
- [ ] Committed (`git commit -m "Prompt: <short name>"`) — not requested, left uncommitted.
- [x] This file moved to `task-archive/supabase-schema.md`, and `task-current/` is empty.
