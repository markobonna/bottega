# shelf-geometry

Status: ⬜ to start · 🟡 in progress · ✅ AI check passed **and** human check done. A row is never ✅ just because the code exists.

| # | How we build it (and with what) | AI check | Human check | Status |
| ---- | ------------------------------------------------------------ | ------------------------------------------------------------ | ------------------------------------- | ------ |
| 1 | src/lib/make/shelf.ts: clampParams, parts, toStl, cutList, toDxf. Muse Code. | `pnpm exec vitest run src/lib/make` passes | — | ✅ |
| 2 | src/lib/make/shelf.test.ts: counts, STL bytes/bbox/normals, cutList, DXF, clamps. Muse Code. | Same run green (7/7) | — | ✅ |

## Decisions

-
