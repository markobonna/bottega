# see-block

Status: ⬜ to start · 🟡 in progress · ✅ AI check passed **and** human check done. A row is never ✅ just because the code exists.

| # | How we build it (and with what) | AI check | Human check | Status |
| ---- | ------------------------------------------------------------ | ------------------------------------------------------------ | ------------------------------------- | ------ |
| 1 | src/components/blocks/See.tsx (photo, /api/see, overlay, legend, counts, save). Muse Code. | `typecheck` passes | Visual 390px light+dark (deferred to login day) | ✅ |
| 2 | Register see in registry. Muse Code. | `typecheck` + `build` pass | Same pass | ✅ |

## Decisions

- 2026-10-27 See.tsx: local object-URL preview (no signing round-trip); overlay svg absolute inset-0 w/h-full, viewBox media dims, paths translated by box x1/y1 in var(--nK) 25%/2px non-scaling-stroke; legend chips toggle with aria-pressed, showing live (corrected) counts; counts init from model (0 when off); save writes counts map + photo path, "Saved." + refresh(); photo input carries DataNotice per Rule 3. No event logging (Prompt 25). Visual deferred to login day. Gate: 40/40, typecheck, build.
