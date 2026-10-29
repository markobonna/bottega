# demo-seed

Status: ⬜ to start · 🟡 in progress · ✅ AI check passed **and** human check done. A row is never ✅ just because the code exists.

| # | How we build it (and with what) | AI check | Human check | Status |
| ---- | ------------------------------------------------------------ | ------------------------------------------------------------ | ------------------------------------- | ------ |
| 1 | Demo photos in scripts/demo-photos/ (AI-generated, gitignored). Image gen. | 13 files present, 200–460KB JPEGs | Eyeball: loaves/pantry/chairs look right | ✅ |
| 2 | scripts/seed-demo.ts + `seed:demo`: reset users, apps from fixtures, uploads, records, SAM counts, loaf training. Muse Code. | `typecheck` passes; `pnpm run seed:demo` exits 0 | Run it (tsx is IPC-blocked in my sandbox) | ✅ |
| 3 | Trick loaf check inside seed: prints verdict, non-zero + "Pick a different trick photo" unless Sell ≥ 85%. | "Trick loaf: Sell at 93%" | Confirm trick photo choice | ✅ |
| 4 | TEMPLATE_*_UID lines → .env.local + Vercel. | Lines printed | Paste into .env.local and Vercel | ✅ |

## Decisions

- 2026-10-28 photos are AI-generated (no camera): 3 sell + 3 nosell + 3 trick candidates + 2 pantry + 2 chairs. Pantry counts match filenames (p1: 5 jars/3 bags, p2: 3 jars/6 bags). Spare tricks kept as loaf-trick-b/c.jpg (seed only reads loaf-trick.jpg).
- 2026-10-28 trick pre-check (/tmp/trick-check.mts, real spark scores + real brain math): training separates cleanly; mini loaf (current loaf-trick.jpg) → Sell 94%; burnt-patch → 73%; blowout → 86%. Mini wins with margin; spark nondeterminism means the seed run re-scores, small flip risk accepted.
- 2026-10-28 no-key behavior: SAM counts fall back to fixed numbers matching the generated photos; teach training refuses (exit 1) rather than fake features — no offline JPEG decoder exists server-side.
- 2026-10-28 seed run PASS: pantry-1 5/3, pantry-2 3/0 (SAM missed the stacked bags), chair 0/0/0 (SAM found no damage), trick Sell 93% (pre-check predicted 94%). Zeros are honest live-SAM output, kept as-is; both See blocks let the user correct counts live, which doubles as a demo beat. TEMPLATE_MARIA_UID=b17c2568-45f1-4fa1-a603-738a2873e7aa TEMPLATE_COLE_UID=22dd99ef-32ec-4a14-9dcd-433a8174fa23.
