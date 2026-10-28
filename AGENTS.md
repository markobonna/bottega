# AGENTS.md: Bottega

Rules for any coding agent (Muse Code) working in this project. Prompt 32 adds the project facts (stack, folders, commands) below these rules; it must keep this section.

## Working rules: one task per build prompt

- **Start a task (kickoff):** copy `feature-building.md` to `task-current/feature-building.md`. Fill in the Goal and the Build table for that prompt only, and write no code until it's filled in.
- **Start of every session:** if `task-current/feature-building.md` exists, read it and say in two lines where we are and what's next.
- **Before changing anything:** say in one line which Goal outcome of the current task it serves. If it serves none, stop and ask.
- **A row is ✅ only** when its AI check passed and its human check (if necessary) was done by the human. Never mark ✅ because code exists.
- **If something breaks in a new way,** add a check for it to that row.
- **End of every session:** update Status, Decisions, Next up and the Check log. Log only checks actually run, with their real result.
- **Finish a task:** run the Finish checklist in the file. Then move it to `task-archive/<task-name>.md`, leave `task-current/` empty, and stop. The human starts the next prompt.

## Hard rules

- Never put personal information (emails, real names, usernames, machine names) in code, files, commits, prompts or requests. Demo accounts are `maria@example.com` and `cole@example.com` only. They are templates: visitors get anonymous guest copies.
- Apps are specs, not code: never generate or run arbitrary code for a user's app.
- The Meta API key stays on the server.
- If Muse Spark and Muse Wonder use their `-contributor` ids where they exist. Every screen where someone adds a photo, recording or text for a model should show the DataNotice line: "Photos, voice and text you add may be used by Meta to improve its models."
