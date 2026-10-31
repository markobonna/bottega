# Bottega

A workshop that builds each person a real, working app from Meta-powered
blocks, shaped around their life. Built for the Meta Global AI Developer
Hackathon 2026 ("Build for your world").

- Describe your world ("I bake for cafés and take custom cake orders…")
  and Muse Spark designs your app: a JSON **spec** (data, screens,
  blocks) that our runtime renders. We never generate or run arbitrary
  code, and every spec is Zod-validated before it saves or renders.
- The loop is describe → build → use → teach → grow: ask for changes in
  words or accept Muse Wonder suggestions; every change is a validated
  spec diff, never a rebuild.
- Hardware projects produce a downloadable **RFQ pack** (brief, CAD,
  drawings) for real US shops, a promise-date countdown, photo-proven
  arrival, and a human sourcing concierge when no supplier fits.
- Two demo worlds prove it — Maria's bakery and Cole's restoration
  bench. "Try as Maria / Try as Cole" gives each visitor a fresh
  private copy (wiped on exit); the templates are never touched.

## Run it locally

Prerequisites: Node >= 20.9 and pnpm (`corepack prepare pnpm@12.15.0
--activate` matches this repo's pin).

1. `git clone <this repo> && cd bottega && pnpm install`
2. Supabase (free tier is enough): create a project, then in
   **Project Settings → API** copy the project URL, publishable/anon
   key, and secret key into `.env.local` (start from `.env.example`).
   With the Supabase CLI installed, link the project and push the
   schema:
   `supabase login && supabase link && pnpm db:push`
3. Seed the demo templates (works with or without a Meta key; without
   one it uses fixed counts and color features and says so):
   `pnpm run seed:demo`
4. `pnpm dev` → http://localhost:3000

Signing in: use the Try-as buttons (no email needed), any real email
via magic link, or `pnpm run login-link -- maria@example.com`, which
prints a sign-in link without sending email.

## Keys (all optional except Supabase)

| Variable | Enables | Without it |
|---|---|---|
| `MODEL_API_KEY` (Meta Model API) | Builder, voice, seeing, drawing, teach scoring, apprentice | Each feature shows its off-state; the rest of the app runs |
| `OPEN_BASE_URL/_KEY/_MODEL` | Muse Spark Open: private mode + fallback | Meta API only |
| `LOCAL_BASE_URL/_MODEL` | Local Glimmer endpoint | Skipped |
| `CONCIERGE_INBOX` (+ `SMTP_*`) | Sourcing-request notifications | User's mail client opens instead |
| Supabase URL/keys | Everything (auth, DB, storage) | Required — see step 2 |

Never commit keys: `.env.local` and `.env` are gitignored, and only
`.env.example` (empty values) is tracked.

## Scripts

`dev` · `build` · `start` · `test` (vitest, 107 tests) ·
`typecheck` (`tsc --noEmit`) · `db:push` / `db:types` (Supabase schema
and generated types) · `seed:demo` (Maria/Cole templates) ·
`login-link` (passwordless demo sign-in) · `check:isolation` (proves
RLS isolation with throwaway users) · `try-build` / `try-see` /
`try-draw` / `try-open` (single-shot model probes).

## Project map

- `src/app` — pages, API routes, server actions
- `src/components/{runtime,blocks,workshop,design}` — app runtime, the
  10 blocks, workshop shell, island/room/board design layer
- `src/lib/{spec,brain,supabase,design,make}` — spec schema + edit ops,
  teach-brain math, Supabase clients, design helpers, shelf geometry
- `supabase/migrations` — schema (apps, versions, records, models,
  workshops, notes, concierge, …), all RLS `owner = auth.uid()`
- `scripts` — seed, probes, checks · `docs` — submission, video plans,
  sample runs

Invariants: specs are data (validated on every write); isolation lives
in the database; secret keys are read only in server code; all UI
colors come from CSS variables; no personal information anywhere (demo
accounts are `maria@example.com` / `cole@example.com`).

## Evaluating without a key

Every AI feature degrades to a polite off-state (see the table above),
and `pnpm test`, `pnpm run typecheck`, and `pnpm run build` need no
keys at all. `docs/sample-runs.md` has captured outputs with
provenance (tests, build, fab-pack ZIP listing, model probes, seed
summary), and the 3-minute demo video is linked in the hackathon
submission.
