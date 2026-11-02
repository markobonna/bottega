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
- Tool toolbar (trade-specific, see below) + margin notes beside the board.
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
| 3 | "← {step 2}" + big "Build and install" (software) or "Send it off" (rest) → send-off dialog | none (but "Your pack" files panel below the board) | Full render; all callouts live | unlocked |
| 4 | "← {step 3}" + "It arrived" (inside the card) | Crate card: RFQ tracking (hardware/print) or "Finishing up" (rest) | Full render; only parts *with* notes stay clickable | **locked** |
| 5 | "← {step 4}" + "See it in the room" + "Next project" (inside the card) | Green card: "{step 5} — vendors", arrival photo if any | Full render + stamped label (It arrived / Go live / …) | locked |

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

### Software — Sketch · Prototype · Build · Test · Go live

- Tools: Screens, Data, Users, Preview (scrolls to the live app).
- Step 1 first asks mobile-or-desktop (saved on the app); the sketch
  stays hidden until picked, and advancing waits too. No painted art:
  the sketch is the spec wireframe (phone frames for mobile,
  browser frames for desktop; one labeled box per block), instant, no
  countdown, no revise form — edits via the change bar redraw it on
  the next version. Shown at step 1 only.
- Steps 2–5 board: the live runtime only (tabs, blocks, change bar,
  tappable on your data) — the app stays on the bench from
  Prototype through Go live. Step 3 adds the pack panel (brief.md
  + "Generate my code (.zip)" into the send-off dialog).
- Step 3 button: "Build and install" → send-off dialog with a REAL
  readout (spec version, design checks, counted screens/blocks/
  collections/records), "Download your app" (single self-contained
  HTML file: spec + record seed + renderer, localStorage-backed,
  AI blocks bring-your-own-key), "Generate my code" (Spark writes
  index.html + styles.css + app.js + README from the same spec in
  the picked shape — dependency-free, "Download code (.zip)"),
  honest per-device open steps, and a "take it further" team contact.
- Step 4 card: "Finishing up" (no vendors, no countdown).
- Step 5 card: "Go live"; board stamped "Go live"; help card appears.

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
