# change-bar-diff

Status: ⬜ to start · 🟡 in progress · ✅ AI check passed **and** human check done. A row is never ✅ just because the code exists.

| # | How we build it (and with what) | AI check | Human check | Status |
| ---- | ------------------------------------------------------------ | ------------------------------------------------------------ | ------------------------------------- | ------ |
| 1 | listVersions + getVersions action. Muse Code. | `typecheck` passes | — | ✅ |
| 2 | ChangeBar + DiffPreview + toast/undo, wired in AppRuntime. Muse Code. | `typecheck` + `build` pass | — | ✅ |
| 3 | Version chip history popover. Muse Code. | `typecheck` passes | — | ✅ |
| 4 | Full gate + visual pass as maria (ask → preview → accept → undo). | `pnpm test` + `typecheck` + `build` ✅ | Ask a change, accept, undo at 390px | 🟡 |

## Decisions

- 2026-10-28 Placing one fixed ChangeBar: mobile sits above the tab bar via bottom offset (tab bar ≈70px + safe area, noted in code), sm+ fixed at viewport bottom; spacer in content so nothing hides underneath. timeAgo duplicated from page.tsx (server module can't be imported into the client popover).
- 2026-10-28 ChangeBar: form submit (button disabled under 3 chars), preview card with +/~/− lists, 409 message + preview closed + text kept, keyOff latches the bar disabled, text cleared on accept / kept on discard, toast 10s with Undo → "Undone." 4s. Version chip fetches fresh on every open. Gate green: typecheck, 54/54, build. Rows 1-3 ✅; row 4 needs human visual.
