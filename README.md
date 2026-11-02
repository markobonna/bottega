# Bottega

A workshop that builds each person real-world hardware or a working
software app from Meta-powered blocks, shaped around their life. Built
for the Meta Global AI Developer Hackathon 2026 ("Build for your
world").

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
- Two guest Bottegas prove it — Maria's bakery and Cole's restoration
  bench. "Try as Maria / Try as Cole" gives each visitor a fresh
  private copy (wiped on exit); the templates are never touched.

## Try it in 30 seconds (judges start here — no install, no sign-up)

1. Open **https://bottega.vip/**
2. Click **Try as Maria** — you get a fresh private copy of her bakery
   world. It wipes when you leave; the template is never touched.
3. Two-minute tour: ask the talk bar to build something, open the
   Espresso machine project, hit **Send off** to see the maker RFQ
   pack. Cole's restoration bench shows the same platform, different
   trade.

Hosted by us through judging (ends Nov 8) — nothing to set up.
Every block runs on live Meta models (Spark, Wonder, SAM 3.1, Voice,
Image) on our keys.

## Run it locally (5 minutes)

You need Node 20.9+ and pnpm
(`corepack prepare pnpm@12.15.0 --activate` matches this repo).

```sh
git clone <this repo> && cd bottega && pnpm install
cp .env.example .env.local
```

Then paste these two lines into `.env.local` (our hosted demo
backend — no Supabase account needed, through Nov 8):

```sh
NEXT_PUBLIC_SUPABASE_URL="https://oyspuvypyuuauydruoxw.supabase.co"
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY="sb_publishable_pDE0Bmqvs8_tdeZdGSC33A_gjNqsvnV"
```

```sh
pnpm dev
```

Open http://localhost:3000 → **Try as Maria**. One click, full guest
Bottega that wipes on exit. Add
`MODEL_API_KEY` to the same file for live AI; without it every AI
feature shows its off-state instead of failing.

> On printing these: the URL and publishable key are public by design
> (they ship in every client bundle). The real boundary is Row Level
> Security — every table is owner-scoped, proven by
> `pnpm run check:isolation` — and the secret key, which never leaves
> our servers and this path never needs. The only shared data is the
> fictional maria/cole guest content; all accounts stay mutually
> invisible. These values come out of this README on Nov 9 — after
> that, use your own Supabase below.

**After Nov 8 — your own Supabase:**

1. Create a free project; in **Project Settings → API** copy the URL,
   publishable key, and secret key into `.env.local`. Then:
   `supabase login && supabase link && pnpm db:push`
2. `pnpm run seed:demo` (works with or without a Meta key; without
   one it uses fixed counts and color features, and says so)
3. `pnpm dev` → http://localhost:3000

Other ways in: any real email via magic link, or
`pnpm run login-link -- maria@example.com`, which prints a sign-in
link without sending email (needs the secret key, so local-only).

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
colors come from CSS variables; no personal information anywhere (guest
accounts are `maria@example.com` / `cole@example.com`).

## Evaluating without a key

Every AI feature degrades to a polite off-state (see the table above),
and `pnpm test`, `pnpm run typecheck`, and `pnpm run build` need no
keys at all. `docs/sample-runs.md` has captured outputs with
provenance (tests, build, fab-pack ZIP listing, model probes, seed
summary), and the 3-minute demo video is linked in the hackathon
submission.
