# hear-block

Status: ⬜ to start · 🟡 in progress · ✅ AI check passed **and** human check done. A row is never ✅ just because the code exists.

| # | How we build it (and with what) | AI check | Human check | Status |
| ---- | ------------------------------------------------------------ | ------------------------------------------------------------ | ------------------------------------- | ------ |
| 1 | Hear.tsx (hold-to-talk, transcript, prefilled FieldInput form, save) + register. Muse Code. | `typecheck` passes | Visual + mic behavior (deferred to login day) | ✅ |
| 2 | Error states (denied, 503 + empty form, 429). Muse Code. | Code review | Same pass | ✅ |
| 3 | /new mic button (transcript appends). Muse Code. | `typecheck` + `build` pass | Same pass | ✅ |

## Decisions

- 2026-10-27 useRecorder hook in wav.ts shared by Hear + /new: pointer hold-to-talk, click toggles for keyboard/switch (click after a hold is swallowed via just-finished flag with 500ms decay; stop-during-mic-acquire is deferred, not stuck). Hear: round accent button + hint + timer + DataNotice, quote transcript, FieldInput prefill (nulls→empty), Save→"Logged."+clear+refresh. Denied/503/429 exact copies; 503 disables mic, form stays usable. /new: round quiet 🎙 fills the Prompt-19 slot, transcript appended (1500 cap). Gate: 47/47, typecheck, build.
