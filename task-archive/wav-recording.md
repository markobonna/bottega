# wav-recording

Status: ⬜ to start · 🟡 in progress · ✅ AI check passed **and** human check done. A row is never ✅ just because the code exists.

| # | How we build it (and with what) | AI check | Human check | Status |
| ---- | ------------------------------------------------------------ | ------------------------------------------------------------ | ------------------------------------- | ------ |
| 1 | Confirm TranscribeResponse transcript field. curl. | Findings recorded + reported | — | ✅ |
| 2 | src/lib/wav.ts + wav.test.ts. Muse Code + Vitest. | `pnpm test` green | — | ✅ |
| 3 | meta.ts transcribe(). Muse Code. | `typecheck` passes | — | ✅ |
| 4 | src/app/api/hear/route.ts (multipart, transcribe, form-fill, checkValues). Muse Code. | `typecheck` + `build` pass | — | ✅ |

## Decisions

- 2026-10-27 Row 1: final transcript field is `transcript` (string, "Final transcript for the whole clip. Populated in every mode"; non-stream JSON also has sessionId, audioDurationMs). WAV request = RIFF/WAVE mono integer PCM 16/24 kHz → our 16 kHz encoder conforms.
- 2026-10-27 recordWav is async (getUserMedia); 60s hard stop; mic tracks stopped; AudioContext closed after decode. Typed-array returns annotated <ArrayBuffer> for BlobPart/copyToChannel.
- 2026-10-27 transcribe() via postForm + trailing headers param (backward-compatible extension for Accept: application/json); 429 flows through postForm's ModelError(status) with no special code; empty transcript → ModelError 502.
- 2026-10-27 Hear route: 400 on bad form/oversize/non-RIFF, 404 on missing app/block/collection, transcript-only without blockId; form-fill schema all-nullable, photo fields skipped (speech can't fill them), checkValues-cleaned values returned best-effort for the prefilled form. Gate: 47/47, typecheck, build with /api/hear.
