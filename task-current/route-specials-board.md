# route-specials-board

Status: ⬜ to start · 🟡 in progress · ✅ AI check passed **and** human check done. A row is never ✅ just because the code exists.

| # | How we build it (and with what) | AI check | Human check | Status |
| ---- | ------------------------------------------------------------ | ------------------------------------------------------------ | ------------------------------------- | ------ |
| 1 | Confirm images/schemas (b64 vs url, sizes); record findings. curl. | Findings recorded + reported | — | ✅ |
| 2 | meta.ts image() + /api/draw route. Muse Code. | `typecheck` passes | — | ✅ |
| 3 | Draw.tsx + register draw. Muse Code. | `typecheck` + `build` pass | — | ✅ |
| 4 | Full gate + live draw probe as maria. | `pnpm test` + `typecheck` + `build` ✅; probe returned valid PNG ✅ | Visual 390px: specials board with pictures | 🟡 |

## Decisions

- 2026-10-28 images/schemas: POST /images/generations {model*, prompt, n, size?, response_format?}; response_format enum ('url','b64_json') default b64_json; Images Response {created, data: ImageObject[]}; ImageObject {b64_json? base64 data, url?}. size is an optional free-form "WxH" string used as aspect ratio ONLY (fixed generator resolution) → send "1024x1024" square; request b64_json explicitly, decode server-side, fetch url as fallback.
- 2026-10-28 image(): 55s timeout (inside the route's 60s), b64 first + url fetch fallback, ModelError 502 on empty. Route: RLS loads (app+block+record-in-app), existing-image short-circuit unless redo, template {fieldId} fill (unknown tokens left as-is, values stripped to 120 chars), user-client upload .png + updateRecord. Draw: newest-6 2-col grid, checker+initial placeholder, per-card Draw it/again, global keyOff hides buttons, DataNotice (record text goes to the model).
- 2026-10-28 Gate green: typecheck, 48/48, build with /api/draw. Rows 2-3 ✅; row 4 needs human try-draw + visual.
- 2026-10-28 Live probe run by agent via plain node (tsx IPC pipe is sandbox-blocked; same image() code path): 613,614-byte PNG of a sourdough loaf, warm light, no text/logos/faces — read back as an image, valid. Throwaway deleted. Row 4 AI half ✅; only the browser visual remains.

