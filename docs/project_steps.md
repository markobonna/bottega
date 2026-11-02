# Project steps: what's on screen at each step

The project page (`BoardPanel`) has 5 steps for every trade. This doc lists
what the visitor actually sees at each one. Read from the code, not from
memory — update it when `BoardPanel.tsx` changes.

## Always on screen (all steps, all trades)

- Title, tagline, "Back to {room}"; 5-step progress row (done = filled dot,
  current = half dot, todo = dashed).
- The board: the generated art when it exists — B&W sketch at step 1,
  color render after (caption "Sketch"/"Render · draft N", notes
  unpinned), with a "Revise the sketch/render" form under it (a sketch
  revise also regrows the portrait so the lineage holds). While art is
  on its way: "Sketch/Render Being Created" with a 30-second countdown
  that re-checks the server every 5 seconds, so landed art swaps in
  early; past zero it holds on "Still sketching/rendering". Only with
  no model key or a failed paint: template SVG drawing + numbered part
  callouts + caption, with the Ink only / As built / Full render view
  switch below it. Exception: software step 2 shows the live runtime
  in the board instead of the art (see Software below).
- Right rail beside the board: margin notes on top, the tool toolbar
  beneath them (tools feed the notes, not the board), plus a "How
  this works" card on software (Blueprint = still look, Prototype =
  tap-through, Download = yours to wire up). Notes ship in every
  download (NOTES.txt in the software zip).
- Portrait line (until the portrait paints), build-photos gallery.
- Drafts on the wall: every version pinned, current one marked.
- The working app itself (list/form/stat/see/… blocks) further down —
  except software step 2, where it renders in the board and the
  below-board copy is skipped (no duplicate). At step 1 the app is
  gated: a dashed card says it arrives at the next step.
- "Done with this project?" danger zone at the very bottom of the
  page, below the working app (two-step delete, returns to the room).

## What changes per step (all trades)

| Step | Buttons | Status card | Board | Notes |
|---|---|---|---|---|
| 1 | "Looks good — {step 2}" | none | B&W sketch photo; 30s countdown until it paints | unlocked |
| 2 | "← {step 1}" + "Next: {step 3}" | none | Color render (grown from the sketch); sketch shown, countdown if neither painted — except software, whose board is the live runtime | unlocked |
| 3 | "← {step 2}" + big "Download" (software) or "Send it off" (rest) → send-off dialog | none (but "Your pack" files panel below the board) | Full render; all callouts live | unlocked |
| 4 | "← {step 3}" + "It arrived" (inside the card) | Crate card: RFQ tracking (hardware/print) or "Finishing up" (rest) | Full render; only parts *with* notes stay clickable | **locked** |
| 5 | "← {step 4}" + "See it in the room" + "Next project" (inside the card) | Green card: "{step 5} — vendors", arrival photo if any | Full render + stamped label (It arrived / Downloaded / …) | locked |

Every step except the first has a back button; going back never deletes
versions or notes. (The half-ink "As built" look still exists in the
Ink only / As built / Full render switcher, but no step defaults to it.)

Step 5 also shows: the arrival dialog (upload the real photo — hardware,
print) and, for software only, the "Need a hand running this?" help card.

## Per trade

### Hardware — Sketch · Design · Pack · Send RFQ · It arrived

- Tools: Sketch, Measure, Parts, Materials, Stress test, Explode.
- Step 2 board: the color render, painted from the step-1 sketch
  (same object and composition).
- Step 3 "Your pack" panel: .scad, -envelope.stl, -brief.md, -fab-pack.zip
  with downloads — this is what the Pack step means.
- Step 3 button: "Send it off" → RFQ dialog (vendors, message, send;
  the Files step repeats the pack).
- Step 4 card: "RFQs out to {vendors}" + "Their reply promised it by…"
  date → live countdown; overdue vendors get nudge links.
- Step 5 card: "It arrived — {vendors}"; board stamped "It arrived".

### Print — Sketch · Design · Proof · Send RFQ · Collect

- Tools: Layout, Type, Color, Proof.
- Step 3 button: "Send it off" → RFQ dialog.
- Step 4 card: same RFQ tracking as hardware.
- Step 5 card: "Collect — {vendors}"; board stamped "Collect".

### Software — Sketch · Prototype · Download (ends here; no Test, no Go live)

- Revision 4: Spark designs AND builds the app directly (real
  HTML/CSS/JS, no block catalog), in two small replies instead of
  one giant one: the design (HTML + CSS) first, then the prototype
  (JS + readme) wired to that exact design. The row carries a stub
  spec plus the brief; the design call fills in the look once the
  shape is picked. Legacy spec-built apps (seeds) keep the classic
  wireframe + runtime renderers below.
- Tools: Screens, Data, Users, Preview (scrolls to the app).
- Step 1 first asks mobile-or-desktop; picking it designs the app
  (countdown while Spark works, honest 503 off-state without a
  key). The Blueprint is the designed app itself in a sandboxed
  iframe — genuinely static, look, don't touch — framed in the
  picked shape. "Redesign for mobile/desktop" regenerates in the
  other shape (the old prototype JS goes with the old HTML it
  wired). Advancing waits for the files.
- Step 2 arrival auto-builds the prototype from the design
  (countdown, honest failure card with retry). Steps 2–3 board:
  the working app in the sandboxed iframe — interactive, tappable,
  runs on its own data (sandboxed: no same-origin, so generated
  code can't touch the Bottega session; a preview-only guard traps
  link/form navigations so the app can't load Bottega inside
  itself), plus "Open fullscreen".
- Change bar revises the FILES directly (Replit-style): Spark
  returns the full updated set, preview names the changed files,
  accept stores a versioned revision (history capped at 10, undo
  pops). Suggestions stay silent for files-apps (they speak
  spec-ops).
- Step 3 button: "Download" → send-off dialog: file readout (names
  + KB, counted not performed), "Download code (.zip)" zips the
  stored files (only when all four are present — otherwise an
  honest "walk back to Prototype" line), "Redesign" rebuilds both
  phases from the brief (previous files stay undoable). First-pass
  framing throughout: download to keep adding features, or ask the
  team. Done screen carries the "take it further" team contact.
- The zip leaving the browser lands the DB at arrived: green
  "Downloaded" card ("unzip it, double-click index.html, and it
  runs"), board stamped "Downloaded", "Downloaded!" arrival
  moment, help card appears. The stepper stays on Download (shown
  position 3 of 3); Back returns to Download, and "Download again"
  on the card reopens the dialog (change-bar revisions flow into
  the next zip). The Test slot is skipped in both directions.

### Music — Sketch · Write · Record · Mix · Release

- Tools: Melody, Chords, Lyrics, Tempo, Listen.
- Step 3 button: "Send it off" → send-off dialog.
- Step 4 card: "Finishing up".
- Step 5 card: "Release"; board stamped "Release".

### Dance — Sketch · Choreograph · Preview · Rehearse · Perform

- Tools: Counts, Formations, Music, Video, Rehearse.
- Step 3 button: "Send it off" → send-off dialog.
- Step 4 card: "Finishing up".
- Step 5 card: "Perform"; board stamped "Perform".

### Recipe — Sketch · Develop · Cost · Recipe card · Cook

- Tools: Ingredients, Steps, Cost, Taste test.
- Step 3 button: "Send it off" → send-off dialog.
- Step 4 card: "Finishing up".
- Step 5 card: "Cook"; board stamped "Cook".
