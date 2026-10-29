# suggest-muse-wonder

Status: ⬜ to start · 🟡 in progress · ✅ AI check passed **and** human check done. A row is never ✅ just because the code exists.

| # | How we build it (and with what) | AI check | Human check | Status |
| ---- | ------------------------------------------------------------ | ------------------------------------------------------------ | ------------------------------------- | ------ |
| 1 | events.ts + logEvent action + 8 call sites. Muse Code. | `typecheck` passes | — | ✅ |
| 2 | SUGGEST_SYSTEM + /api/suggest (Wonder). Muse Code. | `typecheck` + `build` pass | — | ✅ |
| 3 | Suggestions.tsx strip + AppRuntime wiring. Muse Code. | `typecheck` passes | — | ✅ |
| 4 | Wonder id check + gate + live suggest probe + visual. | GET /models lists wonder ✅; `pnpm test` + `typecheck` + `build` ✅; probe returns suggestions ✅ | Visual strip + accept one suggestion | 🟡 |

## Decisions

- 2026-10-28 GET /models lists muse-wonder-1.0 (no contributor variant) — the suggest route uses it as-is.
- 2026-10-28 teach_trained {n} uses the example count at train time (rounds are always 20, uninformative); teach_corrected {from,to} uses the model's guess label → the user's asserted label.
- 2026-10-28 logEvent action swallows errors (fire-and-forget); callers use `void` (no await). Only spec ids/counts in details, no user text. Suggestion accept sends summary `${title} — ${why}` with source 'suggest'; 409 maps to "these ideas are stale". Strip renders only on the first screen; successes cached in sessionStorage per appId:version (failures refetch).
- 2026-10-28 Live Wonder probe (throwaway, deleted): first call hit the 30s default → route timeoutMs 55000 (in maxDuration 60). Then 3/3 applied with usage-grounded whys; second run 2/3 (one cleanly filtered by applyOps, as designed). Gate: typecheck, 54/54, build with /api/suggest. Rows 1-3 ✅; row 4 needs human visual.

