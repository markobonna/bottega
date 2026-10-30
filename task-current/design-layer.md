# design-layer

Status: ⬜ to start · 🟡 in progress · ✅ AI check passed **and** human check done. A row is never ✅ just because the code exists.

| # | How we build it (and with what) | AI check | Human check | Status |
| ---- | ------------------------------------------------------------ | ------------------------------------------------------------ | ------------------------------------- | ------ |
| 1 | Vendor art (core/types/art/common/world pristine) + TS keyword map + WorldScene island on home. | `typecheck` + `build` pass | Island renders, tags link, lot button works | 🟡 AI green; visual pending |
| 2 | Workshop identity: migration 0005 (type column + backfill), type picker chips on Start-a-Workshop, stored type drives island + copy; seed sets cafe/garage. | `typecheck` + `build` pass after db:types | Picker works, island buildings match | 🟡 AI green; visual pending |
| 3 | Zoom transitions per depth (world 1 → workshop 2 → project 3) + scene CSS + fonts. Try-as lands on world now. | `typecheck` passes | Camera feel on nav, light + dark | 🟡 Verify: land world, zoom in/out |
| 4 | Project visuals: migration 0006 (kind + art paths), kind toggle in settings, "Build" button + /api/project-look (look + blueprint via image model), art on workshop cards, try-as copies kind + art. | 73/73 + `typecheck` + `build` (`/api/project-look` listed) | Build on software + hardware, images show | 🟡 AI green; visual pending |

## Decisions

- Art files vendored PRISTINE from docs/design; B.store.freeSlot stubbed at runtime (brief's suggested edit avoided).
- Scene tokens scoped under .b-scope so our theme + dark mode survive; art SVG uses fixed hex (imagery, like photos).
- Project level stays our blocks runtime (no stages/notes/send-off backend exists).
-
