# Bottega: Feature Building Document

# Feature Building: Prompt: [name]

> **This file is the template.** Do not fill it in here. One task per build prompt (32 in total):
>
> 1. **Kickoff:** copy this file to `task-current/feature_building.md` and fill in "This task's goal" from Prompt given to you. Write no code yet.
> 2. **Build:** work through building the fewatuers in th eprompt and keep Status, Decisions, Next up and the Check log current.
> 3. **Finish:** when every row is ✅, run the Finish checklist, move the file to `task-archive/<short-name>.md`, and leave `task-current/` empty for the next prompt.
>


Started: [date] · Status: 🟡 building / ✅ finished

## Bottega's goal (the same in every task)

Bottega is a workshop where a person describes their world and Meta's models build them a working app made of blocks (See, Hear, Draw, Teach, Price, Compare), which they then teach and change by talking to the model. The person can also build physical things by creatign the CAD design and ordering from a manufacturer. Two demo people, Maria (bakery and coffee show cafe worker) and Cole (weekend furniture restorer and carpentry tinkerer in his garage), get two clearly different apps from the same platform. Anyone can tap "Try as Maria" or "Try as Cole" to get a fresh private copy with no email, or "Build your own Bottega" with an email magic link.

## This task's goal

**What this prompt delivers:** [one or two sentences, from the prompt]

**Done when** (each one checkable):

1. [outcome]
2. [outcome]
3. [the prompt's own Check passes]

**Not in this task:** [anything that belongs to a later prompt]

**Needs (finished earlier):** [prompt numbers this builds on]

## Build

Status: ⬜ to start · 🟡 in progress · ✅ AI check passed **and** human check done. A row is never ✅ just because the code exists.

| #    | How we build it (and with what)                              | AI check                                                     | Human check                           | Status |
| ---- | ------------------------------------------------------------ | ------------------------------------------------------------ | ------------------------------------- | ------ |
| 1    | [file or component, what it does, and the tool or model: Muse Code, Supabase, Vercel, Muse Spark, SAM 3.1…] | [what Muse Code runs to prove it: test, typecheck, build, curl, script] | [what the human sees or clicks, or —] | ⬜      |
| 2    |                                                              |                                                              |                                       | ⬜      |

## Decisions

- [date] [choice made and why: anything that differs from the prompt, or a doc that disagreed with it]

## Next up

[the next row to work on, so a new session can pick up where this one stopped]

## Check log

Only checks actually run go here, with their real result.

| Date | Row  | Check run | Result | Notes |
| ---- | ---- | --------- | ------ | ----- |

## Finish

- [ ] Every Build row is ✅.
- [ ] The automated gate passed: `pnpm test`, `pnpm run typecheck` and `pnpm run build`, whichever exist so far. Logged above.
- [ ] Every human check was done by the human, not assumed.
- [ ] The prompt's own **Check** from the build doc passed and is logged.
- [ ] Anything a later prompt needs to know is in Decisions.
- [ ] Committed (`git commit -m "Prompt: <short name>"`).
- [ ] This file moved to `task-archive/prompt-<short-name>.md`, and `task-current/` is empty.
