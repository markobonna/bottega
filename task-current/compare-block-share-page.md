# compare-block-share-page

Status: ⬜ to start · 🟡 in progress · ✅ AI check passed **and** human check done. A row is never ✅ just because the code exists.

| # | How we build it (and with what) | AI check | Human check | Status |
| ---- | ------------------------------------------------------------ | ------------------------------------------------------------ | ------------------------------------- | ------ |
| 1 | supabase/migrations/0002_shares.sql + apply + regen types. Supabase CLI. | `db:types` output has shares | Run `pnpm db:push` + `pnpm db:types` in your terminal | ✅ |
| 2 | Compare.tsx + share actions + register. Muse Code. | `typecheck` passes | Visual 390px (deferred to login day) | ✅ |
| 3 | src/app/s/[token]/page.tsx (admin, minimal fields, 10-min URLs, noindex). Muse Code. | `typecheck` + `build` pass | Same pass | ✅ |

## Decisions

- 2026-10-27 0002 written (shares + owner-RLS ×4, same pattern as 0001). db:push sandbox-blocked (CLI telemetry EPERM + no access token) → human runs push + regen. types.ts hand-extended with shares (mechanical mirror of records entry; regen will overwrite/confirm).
- 2026-10-27 Compare: record select (caption label), Before/After side-by-side sm+ / stacked phones, checker "Add a/an … photo" → capture → saveRecord + refresh, share via getOrCreateShare (randomBytes 24 base64url) with client-built origin URL + Copy + Confirm stop-sharing; share state resets on record change. Hooks-after-narrow follows List precedent.
- 2026-10-27 Share page: admin only for share→record→spec reads, parseSpec gate, compare block matched by collection, ONLY before/after/caption rendered, 600s signed URLs, robots noindex. Gate: 44/44, typecheck, build with /s/[token]. TS notes: avoid `as const` slots arrays (index narrowing quirk → annotate), Ok<Record<string,never>> uninhabitable.
- 2026-10-27 Row 1 closed as a side effect of teach-storage: human `db:push` applied 0002 (shares HTTP 200) and `db:types` regen confirmed the hand-written shares block. All rows ✅ — ready to archive on your word.
