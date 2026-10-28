# builder-system-spec

Status: ⬜ to start · 🟡 in progress · ✅ AI check passed **and** human check done. A row is never ✅ just because the code exists.

| # | How we build it (and with what) | AI check | Human check | Status |
| ---- | ------------------------------------------------------------ | ------------------------------------------------------------ | ------------------------------------- | ------ |
| 1 | Confirm structured-output docs (response_format? unions/anyOf? limits?); report; flat wire schema iff unions unsupported. curl/web. | Findings recorded + reported | — | ✅ |
| 2 | src/lib/prompts.ts BUILDER_SYSTEM per contract. Muse Code. | `typecheck` passes | — | ✅ |
| 3 | src/app/api/build/route.ts (requireUser, json reasoning medium, ONE repair, 422, createApp). Muse Code. | `typecheck` + `build` pass | — | ✅ |
| 4 | scripts/try-build.ts + live check with real key. tsx. | Prints block types per screen | — | ✅ |

## Decisions

- 2026-10-27 Row 1 findings (dev.meta.ai/docs/structured-output): (1) response_format {type:'json_schema',json_schema:{name,schema}} on /chat/completions confirmed — matches meta.ts exactly; strict omitted (default false) still constrains output. (2) oneOf/allOf NOT supported anywhere; anyOf supported BELOW root; root must be object (meta.ts already guards). Doc examples use MODEL_API_KEY + https://api.meta.ai/v1 — our naming confirmed. (3) Limits: depth 10, 5000 props, 120k chars, 1000 enums, 200k expanded nodes — AppSpec is far under. Unions OK as anyOf → verify z.toJSONSchema emission + live POST before deciding flat vs union.
- 2026-10-27 z.toJSONSchema emits oneOf for the block union → FLAT wire schema built (WireSpecSchema in prompts.ts, verified oneOf-free). Wire keeps shapes only (type stays an enum per prompt); parseSpec is the real check.
- 2026-10-27 Live check green: bike-shop description → flat schema accepted, first draft 1 issue (screens[1].icon '⚙️' two code points) → repair → parses: Repairs (list, form), Spare parts (list, form, stat), Customer photos (compare). Run via curl+parseSpec (tsx sandbox-blocked; try-build.ts is the same pipeline as a runnable wrapper). Fixed meta.ts reasoning → reasoning_effort per docs/reasoning (literal field 400s; option name unchanged). maxTokens 4000 for build/repair (800 truncates specs). Gate: 40/40, typecheck, build with /api/build.
