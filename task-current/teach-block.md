# teach-block

Status: ⬜ to start · 🟡 in progress · ✅ AI check passed **and** human check done. A row is never ✅ just because the code exists.

| # | How we build it (and with what) | AI check | Human check | Status |
| ---- | ------------------------------------------------------------ | ------------------------------------------------------------ | ------------------------------------- | ------ |
| 1 | Curve.tsx + Dials.tsx + lib support (setFeatures, COLOR_DIM_NAMES). Muse Code. | `typecheck` passes | — | ✅ |
| 2 | Teach.tsx (examples/practice/dials/check) + register teach. Muse Code. | `typecheck` + `build` pass | — | ✅ |
| 3 | Full gate. | `pnpm test` + `typecheck` + `build` | — | ✅ |
| 4 | Visual + full teach loop as maria at 390px light + dark. | — | Add 2+2 examples, practice, dials, check + correct a photo | ⬜ |

## Decisions

- 2026-10-27 Port sources old-idea/tiny-brain/.../BrainPanel.tsx + PracticeStep.tsx absent (4th time) → clean-room from prompt spec; chart/dial/upload patterns from Stat/globals/See instead.
- 2026-10-27 Curve: fixed 0..50% axis, Stat-style line + soft area + last-point label + figcaption. Dials: dial-in per dim with aria-labels, vote bar |x·w|/6 of half-track in side color + pushWords, plain-in for Starting lean.
- 2026-10-27 No-mix rule vs color fallback: route-first + colorFeatures-on-503 applies ONLY while the model has no examples (first example sets source, provisional row flipped via resetModel); once examples exist the source is fixed — spark models refuse with a calm message when the key is off instead of mixing, color models always use colorFeatures and migrate solely through Re-read.
- 2026-10-27 --side-a/--side-b are global tokens; the labels[0]→side-a mapping is established by use (borders, votes, verdict) rather than redundant re-declaration on the root.
- 2026-10-27 Teach.tsx: brain in a ref + tick (mutating API), train synced explicitly at each mutation, provisional-spark model on mount flipped by first example, 90ms practice loop (sync with reduced motion), dials live + 600ms debounced save on release, last-6 checked strip, Was/Now correction line. setFeatures added to teach.ts/actions for Re-read. TS: narrowing doesn't cross nested fn bodies → capture sparkDimNames/block consts.
- 2026-10-27 Gate green: typecheck, 48/48, build. Rows 2-3 ✅; row 4 needs human visual + full loop on prod as maria.
