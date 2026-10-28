# Bottega: Feature Building Document

# Feature Building: Prompt: app-shell

Started: 2026-10-27 · Status: 🟡 PARKED (row 5 blocked: cannot log in, header unverified)

## Bottega's goal (the same in every task)

Bottega is a workshop where a person describes their world and Meta's models build them a working app made of blocks (See, Hear, Draw, Teach, Price, Compare), which they then teach and change by talking to the model. The person can also build physical things by creatign the CAD design and ordering from a manufacturer. Two demo people, Maria (bakery and coffee show cafe worker) and Cole (weekend furniture restorer and carpentry tinkerer in his garage), get two clearly different apps from the same platform. Anyone can tap "Try as Maria" or "Try as Cole" to get a fresh private copy with no email, or "Build your own Bottega" with an email magic link.

## This task's goal

**What this prompt delivers:** The app shell — shared UI primitives, magic-link sign-in + callback, route protection in the proxy, a local login-link script for the demo accounts, TopBar, and the signed-in layout.

**Done when** (each one checkable):

1. `src/components/ui.tsx` exports Label, btn, card, Status, DataNotice, Confirm per spec.
2. Magic link round-trips: /sign-in sends, /auth/callback exchanges, failures show the specified message. No passwords anywhere.
3. Every route except /sign-in, /auth/*, /s/* redirects to /sign-in without a session.
4. `pnpm run login-link -- maria@example.com` prints a magic link and sends no email.
5. TopBar + layout shell render on signed-in pages at 390 px, light and dark.

**Not in this task:** Try-as buttons (Prompt 30), any workshop/app pages, seed data, real demo photos.

**Needs (finished earlier):** setup (toolchain), supabase-schema (clients, proxy, types).

## Build

Status: ⬜ to start · 🟡 in progress · ✅ AI check passed **and** human check done. A row is never ✅ just because the code exists.

| # | How we build it (and with what) | AI check | Human check | Status |
| ---- | ------------------------------------------------------------ | ------------------------------------------------------------ | ------------------------------------- | ------ |
| 1 | src/components/ui.tsx: Label, btn.{primary,quiet,small}, card, Status, DataNotice, Confirm. Muse Code. | `pnpm run typecheck` passes | Visual pass at 390 px light + dark (via sign-in page) | ✅ |
| 2 | src/app/sign-in/page.tsx + form.tsx + requestLink action, src/app/auth/callback/route.ts, signOut action. Muse Code + Supabase Auth. | `typecheck` + `build` pass | Real email round-trip: link arrives, click lands on /; bad link shows the failure message | ✅ |
| 3 | Route protection in src/proxy.ts (allow /sign-in, /auth/*, /s/*). Muse Code. | `build` lists the Proxy route | Incognito: / redirects to /sign-in; /sign-in renders | ✅ |
| 4 | scripts/login-link.ts + tsx 4.23.15 dev dep + `login-link` script. Muse Code. | `typecheck` covers the script | Paste the real SUPABASE_SECRET_KEY into local .env.local, run `pnpm run login-link -- maria@example.com`, link prints, no email arrives | 🟡 script now prints OUR callback link (token_hash flow); fresh human run pending |
| 5 | src/components/TopBar.tsx + layout shell (TopBar when signed in, main wrapper). Muse Code. | `typecheck` + `build` pass | Header/menu/sign-out at 390 px light + dark | 🟡 FAILING: signed in as maria, no header visible. Prime suspect: stale dev server (predates layout/proxy edits) or testing the Vercel URL instead of localhost. 2nd report: cannot log in at all now (stale link? dev down? rate limit?) — header still unverified |

## iDecisions

- 2026-10-27 Sign-in is split: server `page.tsx` (reads the `?error=` param) + client `form.tsx` (`useActionState`), avoiding a `useSearchParams` Suspense boundary. Heading uses the display font, matching the home placeholder.
- 2026-10-27 `btn.small` uses trailing-`!` utilities so it wins over the variant's own padding when composed (same-property utilities resolve by stylesheet order, not class order).
- 2026-10-27 `pnpm approve-builds esbuild` persisted as `pnpm-workspace.yaml` (`allowBuilds: esbuild: true`); tsx 4.23.15 verified printing its version. tsx cannot run scripts in this sandbox (IPC pipe `listen EPERM`), so row 4's run check belongs to the human terminal, which also holds the real secret.
- 2026-10-27 Home placeholder's `<main>` became a `<div>`: the new layout already renders the single `<main>` landmark.
- 2026-10-27 Untouched-by-me edits noticed: `<short-name>` → `<task-name>` in AGENTS.md and feature-building.md (matches the task-name archive convention already in use).
- 2026-10-27 Row 3 marked ✅ by the human while declining the incognito retest. LATER (same day): human reported signed-out localhost:3000/ redirects to /sign-in — the redirect IS browser-verified after all. Risk retired.
- 2026-10-27 Row 5 triage: signed-in-as-maria with no TopBar, plus the earlier incognito confusion, both fit (a) a dev server started before the ~18:15 layout/proxy edits that never picked them up, or (b) testing the Vercel deployment instead of localhost:3000 (TopBar is uncommitted, so undeployed). First fix attempt: kill any running `pnpm dev`, start fresh, confirm the URL bar says localhost:3000.
- 2026-10-27 PARKED, not archived: rows 1–4 ✅, row 5 red (login blocked → header unverified). Left in task-current/ deliberately so the red row can't be mistaken for done. Next prompt kicks off alongside; unpark per "Next up" when login works.
- 2026-10-27 Demo sign-in reworked (human: "supabase is blocking it, just make it go through"): login-link now prints `OUR /auth/callback?token_hash=…&type=…` (token extracted from the action link, raw link as fallback), and the callback exchanges token_hash via verifyOtp when no `code` is present. Real-email PKCE flow untouched (code path first). Row 4 flipped back to 🟡 — the printed link shape changed, needs one fresh human run.
- 2026-10-27 Human reports login works on Vercel but localhost "sends me to the vercel site": that bounce is Supabase's Site-URL fallback, i.e. an OLD supabase.co/verify link was opened (single-use/expired, escapes to production). Localhost is likely missing from Auth → Redirect URLs. Also: .env.local STILL shows the redacted secret placeholder at 19:0x while the human's runs reach the API — they must be exporting the real key in their shell, or repasting then re-pulling. Token_hash flow avoids /verify entirely once dev serves the new callback.
- 2026-10-27 ROOT CAUSE (screenshot: both demo users "Waiting for verification", i.e. no token ever verified): the token_hash rework was the wrong layer — those tokens never verify via verifyOtp, and old links escape to production because localhost isn't in Redirect URLs. Reverted: login-link prints the raw action link again (kept the real fixes: main() wrapper, `--` stripping, secret guard) and the callback is code-exchange only. The actual fix is config: add http://localhost:3000/** to Auth → Redirect URLs, then fresh dev + fresh link. This also heals localhost real-email login, which needs the same allowlist entry.

## Next up

PARKED per human "move on" (2026-10-27). Untested: src/app/auth/confirm/page.tsx (fragment-absorbing client page for admin demo links; login-link redirectTo now points there). Human directive 19:31: build blind — no more login debugging until the human says so. Unpark: fresh dev + fresh login-link → sign in → verify rows 4–5 → Finish → archive.

## Check log

Only checks actually run go here, with their real result.

| Date | Row | Check run | Result | Notes |
| ---- | ---- | --------- | ------ | ----- |
| 2026-10-27 | 1–5 | `pnpm run typecheck` | Pass (exit 0) | Covers ui.tsx, TopBar, sign-in, callback, proxy, login-link script. |
| 2026-10-27 | 1–5 | `pnpm test` | Pass | 9/9 brain tests still green. |
| 2026-10-27 | 2,3,5 | `next build --webpack` | Pass (exit 0) | Routes /, /sign-in, /auth/callback + "ƒ Proxy (Middleware)". |
| 2026-10-27 | 4 | `pnpm exec tsx --version` | Partial | Prints 4.23.15, then dies on sandbox IPC pipe block. Script runs must happen in the human terminal. |
| 2026-10-27 | 4 | Human ran `login-link` | Fail → fixed | Crashed: top-level await unsupported under CJS output. Wrapped in `main().catch(...)`; `typecheck` passes. Human rerun pending. |
| 2026-10-27 | 4 | Human reran `login-link` | Fail → fixed | "Invalid email format": Node passes the bare `--` through to argv, so the script read `--` as the email. Now strips `--` args; `typecheck` passes. (Also proves the real secret is pasted — the guard was reached and passed.) |
| 2026-10-27 | 4 | Human ran `login-link` third time | Pass | Maria's link printed and signed her in. |
| 2026-10-27 | 5 | Human checked header as maria | Fail | Signed in, no TopBar visible. Triage: stale dev server or wrong URL (see Decisions). |
| 2026-10-27 | 5 | Human retried sign-in | Blocked | Cannot log in at all; header still unverified. Task parked per human "move on". |
| 2026-10-27 | 4 | `typecheck` + `test` after token_hash rework | Pass | Typecheck clean, 20/20 tests. Human rerun pending. |
| 2026-10-27 | 4 | Human opened fresh token_hash link (cole) | Fail | Still lands on /sign-in. Open question: exchange failed vs session didn't stick (see Next up). |
| 2026-10-27 | 3 | Human visited signed-out / | Pass | Redirect to /sign-in observed in the browser. Row 3 genuinely verified. |
| 2026-10-27 | 4 | Human on localhost sign-in after revert | Blocked | Suspect: opening a stale token_hash-era printed link (now unsupported) or Redirect URLs still unsaved. Awaiting fresh raw-link run. |
| 2026-10-27 | 4,5 | Added /auth/confirm fragment page; gate | Pass (unverified in browser) | typecheck + 20/20 + build (routes /, /sign-in, /auth/callback, /auth/confirm + Proxy). Human: build blind from here, no more login debugging. |

## Finish

- [ ] Every Build row is ✅.
- [ ] The automated gate passed: `pnpm test`, `pnpm run typecheck` and `pnpm run build`, whichever exist so far. Logged above.
- [ ] Every human check was done by the human, not assumed.
- [ ] The prompt's own **Check** from the build doc passed and is logged.
- [ ] Anything a later prompt needs to know is in Decisions.
- [ ] Committed (`git commit -m "Prompt: <short name>"`).
- [ ] This file moved to `task-archive/prompt-<short-name>.md`, and `task-current/` is empty.
