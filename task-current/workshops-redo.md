# workshops-redo

Status: ⬜ to start · 🟡 in progress · ✅ AI check passed **and** human check done. A row is never ✅ just because the code exists.

| # | How we build it (and with what) | AI check | Human check | Status |
| ---- | ------------------------------------------------------------ | ------------------------------------------------------------ | ------------------------------------- | ------ |
| 1 | supabase/migrations/0004_workshops.sql: workshops table + RLS, apps.workshop_id FK, backfill each owner's apps into "My workshop", NOT NULL. | `db:push` + `db:types` clean | Run `pnpm db:push` then `pnpm db:types` (CLI is EPERM-blocked in AI sandbox) | ✅ |
| 2 | Lib: createApp requires workshopId (ownership-checked by callers), createWorkshop/deleteWorkshop actions. | `typecheck` passes | — | ✅ |
| 3 | Routes: / lists workshops ("Start a Workshop" empty state), /workshops/[id] page, /apps/[id] → /projects/[id], /new scoped by ?workshop=, project header links back to parent workshop. | `typecheck` + `build` pass (/, /new, /projects/[id], /workshops/[id] listed) | Click through: home → workshop → project → back | 🟡 Gate green; click-through pending |
| 4 | Seed + /api/try-as copy workshops with id mapping ("Bakery", "Restoration Bench"). Reseed (UIDs stable, no env changes). | `pnpm run seed:demo` exits 0 | Run the reseed | ✅ |
| 5 | Full gate + visual pass. | 73/73 + `typecheck` + `build` ✅ | 390px light+dark, both demos | 🟡 Gate green; visuals pending |

## Decisions

- Internal names stay: table `apps`, columns `app_id`, API field `appId`. Only routes (/projects/[id]), UI text, and the new workshops table use the new words. Zero user-visible "app".
- /new requires ?workshop= (links always come from a workshop page); bare /new redirects home. No workshop picker UI.
- Workshop delete cascades to projects in the DB; storage files orphan (same as project delete today).
- Copy skips events/shares (unchanged); new workshop copies get the template workshop's name.
-
