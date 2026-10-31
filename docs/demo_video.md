# Bottega demo video — script and run-sheet

3 minutes max. Desktop, light mode, 1440px wide or more. External mic.
Never type a personal email on camera — the whole video runs on Try-as
guest copies, which is itself part of the pitch.



## Pre-build (on your real account, before filming day)

Two workshops prebuilt; the Garage gets built on the spot in section
C. Build these with the talk bar (type the description, answer the
kind when asked). Leave every board as built — no need to advance any
of them.

Workshop 1 — Kitchen ("Home Kitchen"):
- "Sunday sauce" (recipe) — e.g. "my Sunday tomato sauce, serves six"
- "Pantry wall" (space) — e.g. "lay out my pantry wall with shelves"
- "Dining chairs" (hardware) — e.g. "wooden dining chairs, set of four".
  This is the on-camera opposite of the live build: big wood furniture
  we keep vs. small metal product we sell.
- "Menu board" (print) — e.g. "a chalk menu board for the counter"
- "Thanksgiving robot" (hardware) — e.g. "a robot arm that plates food".
  Named in section D; leave as built.

Workshop 2 — Dance Studio ("Dance Studio"):
- "Reel dance" (dance) — e.g. "a 30-second dance for Instagram Reels"
- "Gig setlist" (music) — e.g. "a five-song pub gig setlist"
- "Practice log" (software) — e.g. "an app tracking my practice sessions".
  This is the on-camera opposite of the live build: software for fun
  vs. software that runs a business.

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
- [ ] One full rehearsal run of section C below, timed.



## A — Intro (0:00–0:25)

SAY, to camera:

> "I'm Mark, and this is Bottega — a workshop that builds you physical hardware for your real life and software that runs your life ... all from a conversation. Describe your world, and it builds with you: your data, your screens, your items. Software it installs on your machines. Hardware it orders from manufacturers. Let me show you."

## B — The two demos (0:25–0:50)

DO: sign-in page. Maris first then Cole. :

> "Before we build live, there are two demo accounts any of you can use to test the app before creatign yrou own account. Try as Maria or Cole — Maria runs a bakery so lets dive in…" This is her world. Four workshops. Here is Cole's world. Here is his workshop. Every demo is a fresh private copy. Nothing stacks, nothing lingers — sign out and the demo resets. When you exit it resets so nothing is saved."

## C — Build live (0:50–2:20)




DO: "Build a workshop" picker → Garage. Room loads (instant). SAY:

> "Lets build a brand new garage workshop live."

DO: footer talk bar, type "I want to make a sheet-metal headphone
stand I can sell". Apprentice asks
hardware or software. SAY (point at the footer status):

> "Watch the footer — 'Asking Muse Spark.' Every reply is a live model
> call, and it always asks one question first: hardware or software?"

DO: answer "hardware". Build runs — TALK OVER THE WAIT (point at the
"Muse Spark is designing" line and the elapsed seconds):

> "While it designs — every Bottega app is a spec, JSON the runtime
> renders. Validated on every change. Never generated code."

DO: ink-in reveal, project board with drawing. Point at the kitchen's
dining chairs, then back. SAY:

> "We've built dining chairs — big wood furniture we keep. Now the
> opposite: a precision metal product we sell. Give it real
> information — tap Measure…"

DO: tap the Measure tool, margin focuses. Type "must fit 40mm headbands".
SAY:

> "…and that note rides with the project all the way to the maker."

DO: advance, open send-off. Files step — download the RFQ pack, SAY:

> "One zip: the brief, the CAD, the drawings. Everything a real shop
> needs to quote."

DO: Find makers (SendCutSend, Xometry — real shops, jump-cut allowed) →
Message draft → Send. Pack downloads, email draft opens, tick Sent,
"RFQs are out." SAY:

> "RFQs are out to real shops. They reply with a quote and a payment
> link — card ready, because saying yes actually orders it. I just
> won't do that part on camera."

DO: back in the garage, talk bar: "an app tracking my stand sales".
Answer "software". Build, open the project, tap Preview — new tab
with the working app. Take one order by voice. SAY:

> "Same garage, same apprentice — now the software that runs the
> business. The hardware pays for dinner; this counts it. One tap —
> that's the actual app running. Not a mockup."

OPTIONAL, if time allows (15s): inside the Preview tab, open a See
block, take a photo. SAY:

> "'SAM 3.1 is looking' — live counting, right inside the app the
> apprentice just built. Voice, drawing, and suggestions all name
> their models the same way."

IF-FAILS lines (say, smile, keep rolling; cut in edit):

- Build stalls: "The model's thinking — this is the one live wait in
  the video." (If >45s, cut; use the rehearsal take.)
- Any error: "That's the honest error state — let me re-run it."
- Voice fails: "Typing it instead — same apprentice either way."

## D — The world (2:20–2:40): quick cuts

DO: jump-cut through the prebuilt rooms, ~4 seconds each: kitchen
sauce board → Thanksgiving robot board → dance studio reel board →
hold on the world island with all three rooms. SAY:

> "And it's not just the garage. In the kitchen — grandma's recipes
> from the old world, recreated… and the robot that'll make them for
> everyone at Thanksgiving. In the dance studio — what I hope is the
> next viral Instagram Reel. My whole life, in one world."

## E — Close (2:40–3:00): the rocket gag

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
