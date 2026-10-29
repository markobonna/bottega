# edit-routes-diff

Status: ⬜ to start · 🟡 in progress · ✅ AI check passed **and** human check done. A row is never ✅ just because the code exists.

| # | How we build it (and with what) | AI check | Human check | Status |
| ---- | ------------------------------------------------------------ | ------------------------------------------------------------ | ------------------------------------- | ------ |
| 1 | Prove Op[] emits oneOf (local emission check, no API call). Vitest throwaway. | Verdict recorded: oneOf=true → flat wire-op schema | — | ✅ |
| 2 | diff.ts + diff.test.ts (fixtures). Muse Code + Vitest. | `pnpm test` green | — | ✅ |
| 3 | EDITOR_SYSTEM + /api/edit + /accept + /undo. Muse Code. | `typecheck` + `build` pass | — | ✅ |
| 4 | Full gate + live no-save edit probe. | `pnpm test` + `typecheck` + `build`; probe returns preview | — | ✅ |

## Decisions

- 2026-10-28 { summary, ops: Op[] } emits oneOf (local check, throwaway deleted) and the API rejects oneOf (builder-task finding) → same cure as the builder: flat WireOpSchema in prompts.ts + wireOpToOp converter; OpSchema exported for converter + accept-route validation; applyOps stays the gate.
- 2026-10-28 Wire-op field mapping (collisions avoided): screenId/collectionId hold target ids (screen/collection hold full objects for add*), updateScreen takes title?/icon?, updateBlock takes setJson (a JSON object string — arbitrary set values can't be a static schema), moveBlock requires at. Converter throws ops[i]-style messages; OpSchema.parse re-checks each converted op.
- 2026-10-28 diff.ts formats (symmetric, my tests define them): added/removed share "Screen:/Block:/Collection:/Field:" shapes ("Block: Draw · Pretty pictures", "Field: Orders → allergy notes"); changed has "App name/tagline", "Screen title/icon", "Block title/moved", "Price · label rate a → b" (+ added/removed lines), generic "<Type> · <title> updated" fallback so no edit previews silently empty.
- 2026-10-28 Live probe (throwaway, deleted): wire schema oneOf=false; first run the model nailed setJson but dropped updateBlock id → tightened prompt (*-required markers + "especially the target id" rule) + converter treats "" as absent for title/icon/name/tagline; re-run first-shot green with preview "Price · Veneer patch rate 90 → 110". accept/undo skip fail() (no model involved): 409 conflict, 400 nothing-to-undo, 422 bad edit.
- 2026-10-28 Gate: typecheck, 54/54, build with all three edit routes. All rows ✅, task archived.
- 2026-10-28 Post-archive live versions pass (throwaway, deleted): real Supabase as maria — accept → {version:2} with renamed spec, stale baseVersion=1 → {conflict:true} (spec untouched), undo → {version:3} with original spec restored, diff v2→v3 exact, v1 undo throws "nothing to undo" (route maps to 400), zero leftover apps. HTTP route-wrapper pass prepared as /tmp/edit-e2e.sh for the human (needs deploy first; sandbox forbids the agent binding a server port).

