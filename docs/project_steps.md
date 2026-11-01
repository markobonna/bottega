# Project steps: what's on screen at each step

The project page (`BoardPanel`) has 5 steps for every trade. This doc lists
what the visitor actually sees at each one. Read from the code, not from
memory — update it when `BoardPanel.tsx` changes.

## Always on screen (all steps, all trades)

- Title, tagline, "Back to {room}"; 5-step progress row (done = filled dot,
  current = half dot, todo = dashed).
- The board: SVG drawing of the thing + numbered part callouts + caption.
  Below it: Ink only / As built / Full render view switch.
- Tool toolbar (trade-specific, see below) + margin notes beside the board.
- Portrait line (until the portrait paints), build-photos gallery.
- Drafts on the wall: every version pinned, current one marked.
- The working app itself (list/form/stat/see/… blocks) further down.

## What changes per step (all trades)

| Step | Buttons | Status card | Board | Notes |
|---|---|---|---|---|
| 1 | "Looks good — {step 2}" | none | Wobbly ink sketch; all part callouts live | unlocked |
| 2 | "← {step 1}" + "Next: {step 3}" | none | Full-color design; all callouts live | unlocked |
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
- Step 2 board: the actual design in full color (same art as the
  concept SVG in the pack).
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

- Tools: Screens, Flows, Data, Test, Preview (scrolls to the live app).
- Step 3 button: "Build and install" → send-off dialog.
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
