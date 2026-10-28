# describe-screen-build-reveal

Status: ⬜ to start · 🟡 in progress · ✅ AI check passed **and** human check done. A row is never ✅ just because the code exists.

| # | How we build it (and with what) | AI check | Human check | Status |
| ---- | ------------------------------------------------------------ | ------------------------------------------------------------ | ------------------------------------- | ------ |
| 1 | src/app/new/page.tsx + form (heading, Label, textarea, count, Build button, mic room). Muse Code. | `typecheck` + `build` pass | Visual 390px light+dark (deferred to login day) | ✅ |
| 2 | Waiting state (Designing… + elapsed seconds, no fake steps). Muse Code. | Code review | Same pass | ✅ |
| 3 | BuildReveal (staged 180ms reveal from spec, reduced-motion instant, Open my app). Muse Code. | `typecheck` passes | Same pass | ✅ |
| 4 | Errors (503 + samples, 422 retry-keeping-text, 502). Muse Code. | `typecheck` passes | Same pass | ✅ |

## Decisions

- 2026-10-27 Server page.tsx + client form.tsx (sign-in split); BuildReveal staged by visible-count, first item immediate then 180ms, matchMedia reduced-motion shows all. DataNotice under textarea per Rule 3 (describe control). 503 reuses createSample form pattern from home. Elapsed line is a plain muted p (no live-region spam). Exported inputCls from blocks/Form for the textarea. Visual 390px pass deferred to login day (blind-build). Gate: 40/40, typecheck, build with /new.
