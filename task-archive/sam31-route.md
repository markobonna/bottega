# sam31-route

Status: ⬜ to start · 🟡 in progress · ✅ AI check passed **and** human check done. A row is never ✅ just because the code exists.

| # | How we build it (and with what) | AI check | Human check | Status |
| ---- | ------------------------------------------------------------ | ------------------------------------------------------------ | ------------------------------------- | ------ |
| 1 | Confirm (a) SAM id via GET /models, (b) SAM docs: parser input + record fields. curl. | Findings recorded + reported | — | ✅ |
| 2 | Install @meta-sam/parser pinned; src/lib/sam.ts segment(). Muse Code + pnpm. | `typecheck` passes | — | ✅ |
| 3 | src/app/api/see/route.ts (requireUser, 403 path check, parallel nouns, c≥0.5). Muse Code. | `typecheck` + `build` pass | — | ✅ |
| 4 | scripts/try-see.ts + live plumbing check. tsx/curl. | Count/conf printed, SVG written | Real-photo run yourself if desired | ✅ |

## Decisions

- 2026-10-27 Row 1: (a) SAM id is `sam-3.1` (dot; re-confirmed live). (b) Parser takes OpenAI SDK stream events: `parseImageStream(await client.responses.create({stream:true})).finalResult` → install openai too (baseURL override, this call only). Box records {objectId,left,top,right,bottom(half-open),confidence?,frame?}; masks via decodeMaskToSVGPath(maskRecord.mask); metadata:{include_confidence:"true"} as STRING. Pair box+mask by objectId.
- 2026-10-27 SAM_MODEL=sam-3.1 in .env.example + .env.local.
- 2026-10-27 Installed @meta-sam/parser 0.1.0 + openai 7.45.1 (exact). sam.ts: SDK client per call (baseURL/key from config, timeout 45s, maxRetries 0 to fit route 60s), metadata include_confidence STRING, image part detail auto (SDK type requires it), box [left,top,right,bottom] half-open, c = box??mask??0 (fail-closed), pairs by objectId, dims from PNG/JPEG headers (no dep; EXIF rotation ignored — stored photos are pre-baked). Empty SAM_MODEL → MissingKeyError (503 off).
- 2026-10-27 Live check PERFECT: synthetic 6-square PNG → 'square' found all 6 pixel-exact (c .96-.97, SVG paths decode), 'yellow submarine' → []. Run via temp vitest probe calling real segment() (tsx sandbox-blocked); try-see.ts is the runnable wrapper (+try-see script with --env-file, which the prompt's literal command omits). Gate: 40/40, typecheck, build with /api/see.
