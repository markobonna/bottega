# Sample runs (provenance)

Captured outputs so the project can be evaluated with or without a
live model key. Fresh entries were regenerated on 2026-10-31;
historical entries were captured during the build (Oct 2026) and can
be rerun with the commands shown.

## Fresh: `pnpm test` (2026-10-31, no keys needed)

107 passed, 0 failed. Covers spec schema + fixtures, edit ops, brain
math, WAV encoding, price math, shelf geometry, teach color features,
spec diffs, CAD files + brief/pack grouping, fab-pack ZIP + CRC,
concierge input validation, record value checks.

Rerun: `pnpm test`

## Fresh: `pnpm run typecheck` (2026-10-31, no keys needed)

`tsc --noEmit` exits clean.

Rerun: `pnpm run typecheck`

## Fresh: `pnpm run build` (2026-10-31, no keys needed)

Production build passes. Route list (abridged):

```
/api/ask  /api/build  /api/draw  /api/edit  /api/edit/accept
/api/edit/undo  /api/hear  /api/make  /api/nav  /api/project-look
/api/see  /api/suggest  /api/teach/features  /api/try-as
/auth/callback  /new  /projects/[id]  /s/[token]  /sign-in
/workshops/[id]  + Proxy (Middleware)
```

Note: in this sandbox the build runs as `next build --webpack`
(Turbopack's worker can't bind a port here); plain `next build` is
what Vercel runs and what judges should run.

Rerun: `pnpm run build`

## Fresh: fab-pack ZIP (2026-10-31, no keys needed)

The hand-rolled stored-ZIP writer, verified with the system `unzip`:

```
Archive:  /tmp/pack.zip
  Length      Date    Time    Name
---------  ---------- -----   ----
        2  01-01-1980 00:00   README.txt
        3  01-01-1980 00:00   a-brief.md
---------                     -------
        5                     2 files
```

Rerun: `pnpm exec vitest run src/lib/design/fabpack.test.ts`

## Historical: `pnpm run try-open` (captured Oct 2026, needs OPEN_* key)

```
[bottega] chat via open (accounts/fireworks/models/muse-spark-open)
open: model=accounts/fireworks/models/muse-spark-open latency=1403ms zod=PASS data={"n":1}
local: not configured, skipped
TRY-OPEN PASS
```

Rerun: `pnpm run try-open`

## Historical: `pnpm run seed:demo` (captured Oct 2026, needs Supabase; Meta key optional)

```
pantry-1.jpg: jars=5 bags=3 (sam)
pantry-2.jpg: jars=3 bags=0 (sam)
chair-before.jpg: scratches=0 chips=0 veneer=0 (sam)
loaf-sell-1.jpg: y=1 x=[0.90,0.90,0.95,0.85]
...
Trick loaf: Sell at 93%
---
maria@example.com / cole@example.com reseeded
orders=8 pantry=2 specials=3 pieces=3 loaf examples=6
SEED PASS
```

Without a Meta key the seed uses fixed counts and color features and
says so. Never fakes the trick-loaf numbers: a miss exits non-zero.

Rerun: `pnpm run seed:demo`

## Historical: `pnpm run check:isolation` (captured Oct 2026, needs Supabase)

```
B sees 0 apps: PASS (0 rows)
B reads A's record: 0 rows: PASS (0 rows)
B updates A's record: 0 rows: PASS (0 rows)
B inserts into A's app with forged owner: rejected: PASS (rejected)
B downloads A's file: error: PASS (error)
B uploads into A's folder: error: PASS (error)
```

Rerun: `pnpm run check:isolation` (creates and deletes two throwaway
users; nothing else is touched)
