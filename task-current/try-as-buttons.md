# try-as-buttons

Status: ⬜ to start · 🟡 in progress · ✅ AI check passed **and** human check done. A row is never ✅ just because the code exists.

| # | How we build it (and with what) | AI check | Human check | Status |
| ---- | ------------------------------------------------------------ | ------------------------------------------------------------ | ------------------------------------- | ------ |
| 1 | POST /api/try-as: admin copy of template (apps, versions, records, models, examples, photo_features, storage) to the signed-in guest with new ids + rewritten paths. Muse Code. | `typecheck` + `build` pass (`/api/try-as` listed) | — | ✅ |
| 2 | Try as Maria / Try as Cole buttons on /sign-in (anonymous sign-in → copy → open app). Muse Code. | `typecheck` + `build` pass | Click both: fresh copy opens, data present, guest isolated | 🟡 |
| 3 | Supabase dashboard: enable anonymous sign-ins. | Button works without error | Flip the switch | ⬜ |

## Decisions

- Out of scope here: 24h guest cleanup (needs CRON_SECRET + Vercel cron; separate task). Until then each click keeps one anon user + ~4MB storage.
- Copy skips events (guest's own usage drives Wonder) and shares (guest starts unshared).
-
