# make-block

Status: ⬜ to start · 🟡 in progress · ✅ AI check passed **and** human check done. A row is never ✅ just because the code exists.

| # | How we build it (and with what) | AI check | Human check | Status |
| ---- | ------------------------------------------------------------ | ------------------------------------------------------------ | ------------------------------------- | ------ |
| 1 | src/app/api/make/route.ts: sentence → params via json() + clampParams. Muse Code. | `typecheck` + `build` pass (`/api/make` listed) | — | ✅ |
| 2 | src/components/blocks/Make.tsx: sliders, svg views, cut list, STL/DXF downloads, Describe input. Muse Code. | `typecheck` + `build` pass; full suite 73/73 | Visual at 390px: views, table, downloads work | 🟡 |

## Decisions

-
