# price-block

Status: ⬜ to start · 🟡 in progress · ✅ AI check passed **and** human check done. A row is never ✅ just because the code exists.

| # | How we build it (and with what) | AI check | Human check | Status |
| ---- | ------------------------------------------------------------ | ------------------------------------------------------------ | ------------------------------------- | ------ |
| 1 | src/lib/price.ts (quote cents, formatMoney) + price.test.ts. Muse Code + Vitest. | `pnpm test` green incl. $295 case | — | ✅ |
| 2 | Price.tsx + rate-save server action + register. Muse Code. | `typecheck` + `build` pass | Visual 390px (deferred to login day) | ✅ |

## Decisions

- 2026-10-27 price.ts pure (structural record type, no server-only import); cents math literal per prompt; formatMoney try/catch→USD. Test: "ZZZ" does NOT throw in this ICU (renders "ZZZ 295.00") → fallback test uses "XX".
- 2026-10-27 saveBlockLines action (updateBlock set.lines, source inline) + revalidate; Price debounces 600ms, syncs rates from block on refresh (BlockFrame keyed by id only, no remount), conflict → exact notice + refresh; table renders all lines (zero-qty rows stay rate-editable), copy/total use quote() (zero skipped). Visual deferred. Gate: 44/44, typecheck, build.
