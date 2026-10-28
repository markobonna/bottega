# teach-storage

Status: ⬜ to start · 🟡 in progress · ✅ AI check passed **and** human check done. A row is never ✅ just because the code exists.

| # | How we build it (and with what) | AI check | Human check | Status |
| ---- | ------------------------------------------------------------ | ------------------------------------------------------------ | ------------------------------------- | ------ |
| 1 | Confirm image-part format for chat endpoint; note color.ts source. curl. | Findings recorded + reported | — | ✅ |
| 2 | src/lib/color.ts (clean-room per spec; source absent). Muse Code. | Throwaway probe passes, then deleted | — | ✅ |
| 3 | Migration 0003 + types hand-extend. Supabase CLI. | `db:types` output has photo_features | Run `pnpm db:push` + `pnpm db:types` | ✅ |
| 4 | teach.ts + teach-actions.ts + features route. Muse Code. | `typecheck` + `build` pass | — | ✅ |
| 5 | Live scorePhoto probe (temp) + storage cleanup. tsx + Supabase. | x length/range correct, cache hit, row cleaned | Human runs probe after row 3 | ✅ |

## Decisions

- 2026-10-27 Row 1: /chat/completions takes content blocks {type:'text',text} + {type:'image_url',image_url:{url}}; url accepts base64 data: URLs (doc example). MetaMessage extended to string|parts (chat sends through unchanged). old-idea/tiny-brain absent (3rd time) → color.ts clean-room from spec.
- 2026-10-27 color.ts: bucket = argmax of opponent scores (R-Y-G-B order, ties→lowest); gray pixels vote red (common-mode, absorbed by the bias — no threshold); featsFromPixels shares, featsFrom over ImageData RGBA, colorFeatures 64px canvas + 15% crop (rotation-invariant, EXIF ignored). Throwaway probe green (pure colors, mixed shares, sum=1), deleted; no committed test per prompt.
- 2026-10-27 teach.ts/route/actions written, typecheck green. scorePhoto: cache read (length must match dims — stale color rows after resetModel re-score instead of poisoning), spark json() minimal+4000, clamp, upsert (owner,photo_path). teach-actions: no revalidatePath (client refresh() owns it; teach touches no server-rendered records). Void actions return Ok<{done:true}> (Record<string,never> uninhabitable, same as revokeShare).
- 2026-10-27 BLOCKED on human: photo_features 404 in PostgREST (need `pnpm db:push` for 0002+0003, then `pnpm db:types`). Live probe ready at /tmp/probe-teach.ts (maria, PNG generated in-code, cache-hit assert, full cleanup); tsx sandbox-blocked for agent so human runs it.
- 2026-10-27 Gate so far: `pnpm test` 48/48, `typecheck` exit 0, `next build --webpack` exit 0 with /api/teach/features listed. Row 4 ✅; rows 3+5 await human commands.
- 2026-10-27 Human ran db:push + db:types: PostgREST confirms photo_features + shares HTTP 200; regen diff is exactly the hand-written block (shares already in HEAD). Gate re-run green: typecheck, 48/48, build. Row 3 ✅; row 5 needs probe output.
- 2026-10-27 PROBE PASS: spark x=[0.4,0.5,0.5,0.2] on maria dims, second call identical (cache), row present then cleaned. Fixes along the way: /tmp probe needed .mts (CJS top-level-await), then in-project move (tsx ignores NODE_PATH), then self-created throwaway app (maria had none). Cleanup independently verified (app + rows gone). Probe deleted. Row 5 ✅, task archived.
