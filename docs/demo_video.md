# Bottega demo video — script and run-sheet

3 minutes max. Desktop, light mode, 1440px wide or more. External mic.
Never type a personal email on camera — B and C run on Try-as
guest copies (fresh every click, itself part of the pitch); D and E
run on the founder's real account.



## Pre-build (on your real account, before filming day)

Two workshops prebuilt; the Garage gets built on the spot in section
D. Build these with the talk bar (type the description, answer the
kind when asked). Leave every board as built — no need to advance any
of them.

Workshop 1 — Kitchen ("Home Kitchen"):
- "Sunday sauce" (recipe) — e.g. "my Sunday tomato sauce, serves six"
- "Pantry wall" (space) — e.g. "lay out my pantry wall with shelves"
- "Dining chairs" (hardware) — e.g. "wooden dining chairs, set of four".
  This is the on-camera opposite of the live build: big wood furniture
  we keep vs. a small electronic product we sell.
- "Menu board" (print) — e.g. "a chalk menu board for the counter"
- "Thanksgiving robot" (hardware) — e.g. "a robot arm that plates food".
  Named in section D; leave as built.

Workshop 2 — Dance Studio ("Dance Studio"):
- "Reel dance" (dance) — e.g. "a 30-second dance for Instagram Reels"
- "Gig setlist" (music) — e.g. "a five-song pub gig setlist"
- "Practice log" (software) — e.g. "an app tracking my practice sessions".
  Software breadth proof, held in reserve: if D runs short, open it and
  tap Preview — same apprentice, working app, no wait.

## Pre-filming checklist (do all of these)

- [ ] Latest code deployed to Vercel; open the production URL fresh.
- [ ] `MODEL_API_KEY` (and friends) set in Vercel env. Without keys the
      video shows "off" states instead of a demo.
- [ ] Maria and Cole reseeded fresh (`pnpm run seed:demo`), templates
      verified in the seeded summary.
- [ ] Try-as Maria twice in a row: second click must show a clean world
      (proves clean-room; also warms caches).
- [ ] Voice tested once on the Vercel URL. If flaky, TYPE everything —
      voice is a bonus, never the spine.
- [ ] One full rehearsal run of section D below, timed.
- [ ] Price-sign arrival photo saved (any e-ink display photo) for the
      "It's here!" upload in D.



## A — Intro (0:00–0:25)

SAY, to camera:

> "I'm Mark, and this is Bottega — a workshop that builds real physical hardware and full stack software that can manage your real life ... all from a conversation. Describe the world you want to live in, and it builds with you: your data, your screens, your items. Hardware it orders from manufacturers. Software it installs on your hardware. Let me show you."

## B — Maria (0:25–0:50)

DO: sign-in page → Try as Maria. Jump-cut through her world,
~4 seconds each: Café → Dance Studio → Music Room, hold on a
finished board (Espresso machine, "It arrived"). SAY:

> "Before we build live, there are two guest Bottegas you can try.
> Maria runs a bakery — this is her world. In the dance studio — what I hope is the
> next viral Instagram Reel."

## C — Cole (0:50–1:10)

DO: back to sign-in → Try as Cole. Jump-cut through his world,
~4 seconds each: Store → Garage → Kitchen, hold on a finished
board (Restoration Bench, "It arrived"). SAY:

> "And here's Cole — he restores furniture for a living. Same
> platform, completely different world.  And it's not just the garage. In the kitchen — grandma's recipes
> from the old world, recreated… Every visit is a fresh
> private copy. Nothing stacks, nothing lingers — exit and it resets."

## D — Build live: the price sign Hardware (1:10–2:40)

One build, start to finish: a price sign for the founder's own
market-stall side hustle, driven by his phone. WhatsApp is his stated
plan, pinned to the board as a margin note — the voiceover says what
the plan is, never that Bottega runs his messages. Jump cuts allowed
at every advance; the edit keeps it under 90 seconds.

DO: on the real account, "Build a workshop" picker → Garage. Room
loads (instant). Upload a picture of the actual garage as the room
photo. SAY:

> "Now the live build — first, a new workshop. My garage, with a photo
> of the real thing as the room. Say I run a market stall: every price
> changed by hand, chalk in the rain. Let's build a hardware price sign
> I'd configure from my phone."

DO: footer talk bar, type "I want a electric food truck menu sign i can attach to my food truck." 

When Bottega asks hardware or software, SAY "Hardware"
(point at the footer status):

> "Every response is a live Meta Muse model call that is shown in the
> app footer. Every Bottega app is a spec, JSON the runtime renders.
> Validated on every change. Never generated code." "First sketch, drawn by Muse Image from that one sentence — and
> behind it, the spec Spark wrote. Validated before it ever rendered."

DO: advance to Design — the color render, grown from the sketch.
Then talk bar: "sealed against rain, and prices change over
WhatsApp" → notes land in the margin. SAY:

> "The sketch is right, so move on to the design. The color render grows out of the sketch — same object, realized.
> Every decision lands in the margin — sealed case for the rain, and the software plan: prices by WhatsApp. Bottega doesn't run my messages — it carries my plan all the way to the maker. Those notes are database rows — and they ship inside the RFQ zip."

DO: advance to Pack — files bloom in. Download the RFQ pack. SAY:

> "One zip file includes the brief, the CAD, the SCAD source the shop can edit, STL they can print — an entire RFQ pack.  Everything a manufacturer needs to quote."

DO: Find makers (real shops, jump-cut allowed) → approve the message
→ Send (mail draft opens, cut here) → "RFQs are out." SAY:

> "RFQs are out to named shops — SendCutSend, Xometry, real domains —
> with notes on which file to upload where. They reply with a quote
> and a payment link — card ready, because saying yes actually orders
> it. I just won't do that part on camera."

DO: tracking card — enter the vendor's promise date, countdown ticks.
Advance to It arrived — "It's here!" card, upload the arrival photo
(see checklist). SAY:

> "The countdown runs off the date the vendor promises — not a number
> we invented. And it's here: designed, specced, and built, without
> me writing a line of code. That arrival photo lands in my own
> storage — per-user paths, same isolation as everything else. I built
> it for my stall — now I can sell it to every vendor on the street.
> Imagine that in every market from Guadalajara to Pune — each one a
> small business Meta's tools helped start."





IF-FAILS lines (say, smile, keep rolling; cut in edit):

- Build stalls: "The model's thinking — this is the one live wait in
  the video." (If >45s, cut; use the rehearsal take.)
- Any error: "That's the honest error state — let me re-run it."
- Sketch is wrong: "Not it — revise that." (Type the fix in "Revise
  the sketch", cut the repaint.)
- Mail client misbehaves: "The draft's ready — my mail app just
  wants the spotlight." (Cut; pick up at "RFQs are out.")



## E— Build live: Software for the pricing sign, controled by WhatsApp.

DO: go to create a new project

> "Now lets build some software to run the sign. ."

DO: an app tracking my food truck sales — It listens to my commands, I call in orders
from the ftruck. and people can enter orders and be notified  via whatsapp when they are ready. 

DO: State Software

DO: Sketch step — pick mobile (the only question), the wireframe
IS the spec (screens + blocks as ink boxes in phone shape). SAY:

> "One question first — mobile or desktop? The sketch is the
> blueprint in that shape — same screens, same blocks as the app."

DO: advance to Prototype — the working app live in the board. SAY:

> "Prototype: not a mockup — the actual app, the runtime rendering
> the spec's blocks live."

DO (one flowing beat): Build dialog — checks run, "Generate my
code" in mobile shape → Download code (.zip) → Install it → Test:
voice order in the live app ("Two tacos, Friday pickup"), it logs
→ Go live: installed, stamped board → unzip on camera, open
index.html in a browser, tap through. SAY:

> "Build — the spec checks run, and Spark writes the real code from
> the same design: four files, vanilla JS, zero dependencies,
> double-click and it runs. Test it like a customer — voice in,
> transcribed, Muse Spark fills the form, validated and saved. Go
> live — and here's the code outside Bottega, running on its own.
> Atoms and bits, one talk bar — take it, or hand it to us."

IF-FAILS: voice fails → "Typing it instead — same apprentice either
way." (Type the order, keep rolling.) No hear block in the build →
type the order and cut the Test beat shorter. File won't open on
camera → skip it: "and the file's yours — it runs anywhere."

## F — Close (2:40–3:00): the rocket gag

DO: back at the world island, talk bar, type "a robot that builds
rockets". Apprentice asks hardware or software — answer "hardware".
Let it start designing (the "Muse Spark is designing" line appears),
then cut away. The edit is the stop button: never let it finish.
SAY, with a grin:

> "And if you want to be the next Elon Musk — you can. Same apprentice,
> same talk bar… and I'm stopping this one right here, because when
> this quote comes back it's got nine zeros."

Honesty note: the app does NOT estimate cost — never show or claim a
price screen. The billions line is yours, said with a smile. The joke
is that you chickened out, not that the app quoted anything.

SAY, to camera:

> "From a one-dollar washer to a billion-dollar rocket — anything real
> can be built in your own Bottega. Let's see what civilization builds."

Hold one beat on the world island. End.
