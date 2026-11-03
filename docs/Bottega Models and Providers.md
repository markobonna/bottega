# Bottega: Models and Providers

This doc covers which AI models and outside services Bottega uses, what each one does, and what happens when one isn't there. Part 1 is Meta's own models. Part 2 is the other services: the partner credits for open-weight models, and the two services every app needs. Screen-by-screen behavior lives in `project_steps.md`; guest contents in `maria-cole-projects.md`. Model ids below are the confirmed values from `.env.example`.

---

## Part 1: How we use Meta's models

### The short version

Every Meta model has a real job inside someone's app, not a side demo:

| Meta offering | Its job in Bottega | The demo moment |
|---|---|---|
| **Muse Spark** | The architect. Writes software outright, specs hardware, routes the talk bar, edits on request | Maria describes her bakery; Spark writes the spec — and for software, the app itself |
| **Muse Wonder** | Watches how you use your app and suggests what to add next | "You count the pantry every day. Add a low-stock alert?" |
| **Muse Image** | Draws every project's look: B&W sketch, then the color render grown from it | The food-truck sign, sketched then realized |
| **Muse Voice Transcribe** | Lets you talk instead of type | Maria says an order between batches, and it's logged |
| **SAM 3.1** | Sees, outlines and counts things in photos | Pantry jars counted; every scratch on Cole's chair outlined |
| **Muse Spark Open** (open weights) | Runs your app's thinking on models we host ourselves; also the backup if Meta's API is busy | Private mode on the live site (Fireworks, verified) |
| **Muse Glimmer** (open weights) | Runs your app's thinking on the laptop, so nothing leaves the machine | Private mode path; laptop endpoint supported |
| **Muse Code** | The coding agent we build Bottega with | The build itself (claim it only if true) |

On top of these sits **Bottega's own model**: the small checker each user trains on their own photos (the Teach block). Meta's models give it its eyes, and the user gives it its judgment.

### Each model in detail

#### Muse Spark: the architect

- **Model:** `muse-spark-1.3-contributor` through the Meta Model API (`https://api.meta.ai/v1`, OpenAI-compatible). The contributor variant exists for Spark and is what we use.
- **What it does in Bottega:**
  1. **Writes software.** A description plus a mobile/desktop pick becomes a real app in two replies: the HTML+CSS design first (the static Blueprint), then the JavaScript + readme wired to that exact design (the running Prototype). Small replies, validated file sets (`/api/software-design`, `/api/codegen` for revisions).
  2. **Specs the rest.** A description becomes a project spec: structured JSON our schema checks before anything is saved. If a check fails, Spark gets one chance to fix exactly the problems listed (`/api/build`).
  3. **Changes things.** "Add an allergy notes field" becomes a short list of spec edits, or a file-level diff for generated software — previewed, accepted or undone, never a silent rebuild (`/api/edit`).
  4. **Routes the talk bar.** The footer apprentice (type or hold-to-talk) that creates workshops and projects and answers "which room?" (`/api/ask`).
  5. **Fills forms from speech.** After Voice Transcribe turns speech into text, Spark pulls out the fields: "two dozen croissants for Café Luna, Friday" becomes quantity 24, the customer and Friday's date (`/api/hear`).
  6. **Gives the Teach block its eyes.** It scores a photo on the qualities the user cares about (crust color, rise, shape, scoring) as numbers from 0 to 1 (`/api/teach/features`). The user's own model learns from those numbers.
  7. **Sets up the shelf designer.** "A shelf for 40 cookbooks under a 1.2 m window" becomes width, height, depth and shelf count (`/api/make`).
- **Settings:** fixed system prompts so they can be cached; low reasoning effort for anything a user waits on and medium for the first build.
- **Without a key:** the builder says it's off and offers the samples, software shows an honest off-state instead of a design, and every existing app still runs.

#### Muse Wonder: the suggestions

- **Model:** `muse-wonder-1.0` (1M token context). No contributor variant was found for Wonder, so it stays on the standard id.
- **What it does:** it reads your app's design and a summary of how you've used it (records added, counts saved, corrections made, but never your free text) and suggests up to 3 changes to the app. Each suggestion comes with the exact edit, so one tap previews it (`/api/suggest`). It speaks spec-ops, so it stays silent for generated-file software apps.
- **The rule:** it suggests changes to your *app*, never advice about your work or life. Bottega isn't an advice machine.
- **Without a key:** the suggestion strip just doesn't appear.

#### Muse Image: the pictures

- **Model:** `muse-image-1.0`, `POST /v1/images/generations`. $0.01 per image.
- **What it does:** every project's look. One sentence becomes a B&W bare-bones sketch; advancing to Design grows the color portrait out of that sketch via image edit — same object, realized — and revising either regrows the lineage (`/api/project-look`, `/api/project-portrait`, `/api/project-revise`). Each record on a Draw block (Maria's specials) also gets a picture from a template filled with that record's details (`/api/draw`). Pictures are saved, so reloading never pays twice.
- **Guardrails:** the prompt always adds "no text, no logos, no people's faces", and user values are trimmed and cleaned before they go in.
- **Without a key:** projects fall back to an honest template drawing, and the draw button yields to a muted "pictures are off" line.

#### Muse Voice Transcribe: the ears

- **Model:** `muse-voice-transcribe-1.0`, `POST /v1/asr/transcribe`, push-to-talk mode. $3.00 per 1,000 minutes.
- **What it does:** hold to talk on a Hear block, tap the mic on the describe screen, or hold the talk-bar mic anywhere in the app (voice in, voice out for that session). The browser records, converts to WAV (the only format the API takes, so we convert and test that), and sends it.
- **Limits we respect:** up to 10 minutes and 32 MB per recording. Our recorder stops at 60 seconds.
- **Without a key:** the mic is disabled and the form is still there to type into.

#### SAM 3.1: the eyes that count

- **Model:** `sam-3.1` (dot spelling, confirmed) through `POST /v1/responses`. $2.50 per 1,000 images.
- **What it does:** you give it a photo and one short noun ("jar"), and it returns an outline and a box for every match, with a confidence score. For several nouns we make one call per noun in parallel and color each noun's outlines differently. We decode the output with Meta's npm package `@meta-sam/parser`.
- **Where it shows up:** Maria's pantry count — nouns settled as jar / flour bag, saved over time so a chart shows stock going down — and Cole's damage map (scratch / chip / missing veneer; the counts feed his quote).
- **Without a key:** the photo still saves and you type the counts.

#### Muse Spark Open and Muse Glimmer: open weights

- **Muse Spark Open:** about 816B parameters with about 42B active at a time. It reads images. It's far too big for a laptop, so we run it on a hosting provider paid for with the credits (Part 2).
- **Muse Glimmer:** 30B parameters, Apache 2.0, reads images, and is built for long-running local agents. It runs on one consumer GPU or a Mac.
- **What they do in Bottega:**
  1. **Private mode** (a toggle per app, in the app settings sheet). Building and changing the app, and filling forms from voice, run on open weights we host ourselves instead of Meta's API. That's Muse Spark Open on Fireworks on the live site (verified working), or Glimmer when running on the laptop. Seeing, drawing and transcribing still need Meta's API, and the settings sheet lists exactly which blocks those are.
  2. **Backup.** If Meta's API rate-limits or fails during building, editing or suggestions, we retry once on Muse Spark Open, and the screen says "Built with Muse Spark Open". This keeps a live demo alive.
- **How it's wired:** all of these accept the same OpenAI-style requests, so the code changes only the address, key and model name.

#### Muse Code: how we build it

- The 32 build prompts are written to paste into Muse Code one at a time: Muse Spark 1.3 for most of them, Muse Wonder for the heavy ones.
- **Only claim "built with Muse Code" in the submission if we really did.**

### Data handling rules for Meta's models

- **We use the `-contributor` variant of Muse Spark** (`muse-spark-1.3-contributor`, confirmed to exist). It's cheaper because Meta may use what's sent to improve its products. Because people's photos (for Teach), voice transcripts and text go through these calls, every photo, mic and describe control, and the sign-in page, shows one line: "Photos, voice and text you add may be used by Meta to improve its models." No contributor variant was found for Wonder, SAM, Image or Voice, so they stay on their standard ids.
- The model keys stay on the server. The browser never sees them — the only public keys are the Supabase publishable key and URL.
- A user can only send their own photos. Every route checks the photo sits in that user's folder.
- No personal information goes into prompts, headers or logs beyond what the user is actually asking about.

### Rough cost for the hackathon (from Meta's listed prices)

| Model | Our guess for building and filming | Cost |
|---|---|---|
| SAM 3.1 | ~200 images (several nouns per photo, lots of retries) | ~$0.50 |
| Muse Image | ~150 pictures (project sketches + renders + draws) | ~$1.50 |
| Voice Transcribe | ~60 minutes of talking | ~$0.18 |
| Muse Spark and Wonder | Builds, edits, suggestions, feature scoring | Price not on the pages we checked, so check the pricing page (contributor ids are the cheaper tier) |

The paid models are cheap at our scale. Spark and Wonder, which handle the text, are the cost to watch.

---

## Part 2: How we use the other services

### The partner credits (open-weight models)

Three providers are offering credits to *selected* participants to run Meta's open-weight models.

| Provider | Offer | What it is | Status |
|---|---|---|---|
| **Fireworks** | $100 credits + a workshop with Sinan Ozdemir | A hosted catalog of models behind an OpenAI-style API. **Lists both Muse Spark Open and Muse Glimmer** | **LIVE.** Verified working: structured request to `accounts/fireworks/models/muse-spark-open`, ~1.4s, schema check passed. Runs Private mode and the backup |
| **Baseten** | $100 credits + 2M tokens/minute rate limit | Hosted model serving. Lists Muse Spark Open | Standby. The big rate limit suits demo day, when calls bunch up |
| **Modal** | $100 credits, Endpoints, serverless GPUs, sandboxes, training tools | GPUs you program yourself. Lists Muse Spark Open as a partner | Standby. We'd deploy the model server ourselves (vLLM) — only if Fireworks fails |

**What we use them for:** only the open-weight models, for the two jobs in Part 1: Private mode, and the backup when Meta's API is busy. They don't replace SAM, Muse Image or Voice Transcribe, which only Meta's API serves.

**Setup (done for Fireworks; same steps for a second provider):**
1. Get the key and the provider's exact model name for Muse Spark Open.
2. Put them in `OPEN_BASE_URL`, `OPEN_API_KEY` and `OPEN_MODEL`, in `.env.local` and in Vercel.
3. Check whether that endpoint supports structured JSON output and image input. If it doesn't, we ask for "only JSON" and our schema check stays the real gate.
4. For Glimmer on the laptop, use `LOCAL_BASE_URL` and `LOCAL_MODEL` (Ollama, LM Studio or llama.cpp), in `.env.local` only.

**If Fireworks fails:** Glimmer still runs on the laptop, so Private mode works locally (not on the live site). Otherwise Meta's API is the only path for building and editing — the core demo doesn't depend on the credits.

**Use one provider, not three.** Wiring all three adds work and buys nothing for the demo. Set up the first one we get, and add a second only if rate limits bite.

### The services every app needs

These aren't AI models, but Bottega can't run without them. Meta's platform runs models only. It has no accounts, database or file storage.

| Service | What it does for Bottega | Cost |
|---|---|---|
| **Vercel** | Hosts the Next.js app: the pages, plus the server routes that call the models. Live at bottega.vip, deploying on every push | Free tier to start |
| **Supabase** (added through Vercel's Storage tab) | Accounts (magic-link email sign-in, plus anonymous guest copies for "Try as Maria" / "Try as Cole", wiped on exit so every visit starts fresh), the database where each user's worlds, workshops, projects and records live, and photo storage. Its row-level security is why Maria can never see Cole's data | Free tier |

### What we don't use, and why

- **Other AI providers' models** (OpenAI, Google and so on). Every AI job in Bottega runs on a Meta model. That's the point of the hackathon, and it's what the tooling score rewards.
- **Together AI and OpenRouter.** They also host Meta's open models, but we have no credits there, and one provider is enough.
- **Running Muse Spark Open ourselves.** At ~816B parameters it needs a data-center GPU cluster. The partners exist for exactly this.

---

## What we can truthfully say in the submission

- "Every AI feature in Bottega runs on Meta's models: Muse Spark writes software, specs hardware and routes the talk bar; Muse Wonder suggests improvements; SAM 3.1 sees and counts; Muse Voice Transcribe hears; and Muse Image draws every project's look."
- "Private mode runs build/edit/voice-fill on Meta's open-weight models — Muse Spark Open on Fireworks, verified working — and Spark Open also backs up the API during heavy use."
- "Each user also trains their own small model on their own photos, with visible dials and confidence."
- "Built with Muse Code."

## Confirmed during the build

- [x] SAM id is `sam-3.1` (dot spelling).
- [x] Spark contributor id exists (`muse-spark-1.3-contributor`); none found for Wonder, SAM, Image or Voice.
- [x] Fireworks Spark Open verified: structured JSON, ~1.4s, schema check passed.
- [x] SAM nouns settled: jar / flour bag (pantry), scratch / chip / missing veneer (damage).
- [x] Data notice on every photo, mic and describe control feeding a contributor model.

## Still open

- [ ] Muse Spark and Wonder prices.
- [ ] Exercising Baseten / Modal (standby; the provider switch takes any OpenAI-compatible base URL).
- [ ] Glimmer's memory needs on our laptop at our chosen quantization.
- [ ] The official judging rules, once published.
