# Bottega demo video — script and run-sheet

3 minutes max. Desktop, light mode, 1440px wide or more. External mic.
Never type a personal email on camera — the whole video runs on Try-as
guest copies, which is itself part of the pitch.

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

> "I'm [NAME], and this is Bottega — a workshop that builds you a real,
> working app from a conversation. Describe your world, and it designs
> your app: your data, your screens, your blocks. Software it installs.
> Hardware it sends to a maker. Let me show you."

## B — The two demos (0:25–0:50)

DO: sign-in page. SAY:

> "Judges never sign up. Try as Maria — she runs a bakery…"

DO: click Try-as Maria. Countdown runs. SAY over it:

> "…and every click is a fresh private copy. Nothing stacks, nothing
> lingers — sign out and it's gone."

DO: world island loads with 4 workshops. SAY:

> "This is her world. Four workshops. Cole the restorer gets his own."

## C — Build live (0:50–2:35)

DO: open the café workshop. Room interior. SAY:

> "Let's build. A cake stand for the café — hardware."

DO: footer talk bar, type "I want to make a cake stand". Apprentice asks
hardware or software. SAY:

> "It always asks one question first: hardware or software?"

DO: answer "hardware". Build runs — TALK OVER THE WAIT:

> "While it designs — every Bottega app is a spec, JSON the runtime
> renders. Validated on every change. Never generated code."

DO: ink-in reveal, project board with drawing. SAY:

> "There's the drawing. Now I give it real information — tap Measure…"

DO: tap the Measure tool, margin focuses. Type "must fit a 30cm plate".
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

DO: cut to a software project (pre-built). Tap Preview — new tab with the
working app. SAY:

> "And software? Same workshop. One tap — that's the actual app running,
> the same link it installs from. Not a mockup."

IF-FAILS lines (say, smile, keep rolling; cut in edit):

- Build stalls: "The model's thinking — this is the one live wait in
  the video." (If >45s, cut; use the rehearsal take.)
- Any error: "That's the honest error state — let me re-run it."
- Voice fails: "Typing it instead — same apprentice either way."

## D — Close (2:35–3:00)

SAY, to camera:

> "Today it's a bakery and a workbench. But imagine every person with a
> workshop — every cook, every mechanic, every kid with an idea —
> building software that installs and hardware that arrives in a crate.
> That's Bottega. Let's see what civilization builds."

Hold one beat on the world island. End.
