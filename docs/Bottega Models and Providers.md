# Bottega: Models and Providers

This doc covers which AI models and outside services Bottega uses, what each one does, and what happens when one isn't there. Part 1 is Meta's own models. Part 2 is the other services: the partner credits for open-weight models, and the two services every app needs. The technical details live in `Bottega Components.md` (§4) and the build steps in `Bottega Build Prompts, Component by Component.md`.

---

## Part 1: How we use Meta's models

### The short version

Every Meta model has a real job inside someone's app, not a side demo:

| Meta offering | Its job in Bottega | The demo moment |
|---|---|---|
| **Muse Spark** | The architect. It designs your app from your description and changes it when you ask | Maria describes her bakery, and her app appears |
| **Muse Wonder** | Watches how you use your app and suggests what to add next | "You count the pantry every day. Add a low-stock alert?" |
| **Muse Image** | Draws pictures for things in your app | Today's specials board, each with a picture |
| **Muse Voice Transcribe** | Lets you talk instead of type | Maria says an order between batches, and it's logged |
| **SAM 3.1** | Sees, outlines and counts things in photos | Pantry jars counted; every scratch on Cole's chair outlined |
| **Muse Spark Open** (open weights) | Runs your app's thinking on models we host ourselves; also the backup if Meta's API is busy | Private mode on the live site |
| **Muse Glimmer** (open weights) | Runs your app's thinking on the laptop, so nothing leaves the machine | Private mode, fully offline thinking |
| **Muse Code** | The coding agent we build Bottega with | The build itself (claim it only if true) |

On top of these sits **Bottega's own model**: the small checker each user trains on their own photos (the Teach block). Meta's models give it its eyes, and the user gives it its judgment.

### Each model in detail

#### Muse Spark: the architect

- **Model:** `muse-spark-1.3` through the Meta Model API (`https://api.meta.ai/v1`, OpenAI-compatible).
- **What it does in Bottega:**
  1. **Builds the app.** A description becomes an app spec: screens, blocks and the data they keep. The output is structured JSON that our schema checks before anything is saved. If a check fails, Spark gets one chance to fix exactly the problems listed (`/api/build`).
  2. **Changes the app.** "Add an allergy notes field" becomes a short list of edits, which you preview, accept or undo (`/api/edit`). It's a change to your app, not a rebuild.
  3. **Fills forms from speech.** After Voice Transcribe turns speech into text, Spark pulls out the fields: "two dozen croissants for Café Luna, Friday" becomes quantity 24, the customer and Friday's date (`/api/hear`).
  4. **Gives the Teach block its eyes.** It scores a photo on the qualities the user cares about (crust color, rise, shape, scoring) as numbers from 0 to 1 (`/api/teach/features`). The user's own model learns from those numbers.
  5. **Sets up the shelf designer.** "A shelf for 40 cookbooks under a 1.2 m window" becomes width, height, depth and shelf count (stretch, `/api/make`).
- **Settings:** fixed system prompts so they can be cached; low reasoning effort for anything a user waits on and medium for the first build.
- **Without a key:** the builder says it's off and offers two sample apps, and every app still runs.

#### Muse Wonder: the suggestions

- **Model:** `muse-wonder-1.0` (1M token context).
- **What it does:** it reads your app's design and a summary of how you've used it (records added, counts saved, corrections made, but never your free text) and suggests up to 3 changes to the app. Each suggestion comes with the exact edit, so one tap previews it (`/api/suggest`).
- **The rule:** it suggests changes to your *app*, never advice about your work or life. Bottega isn't an advice machine.
- **Without a key:** the suggestion strip just doesn't appear.

#### Muse Image: the pictures

- **Model:** `muse-image-1.0`, `POST /v1/images/generations`. $0.01 per image.
- **What it does:** each record on a Draw block (Maria's specials) gets a picture made from a template filled with that record's details, e.g. "a bakery display photo of {name}: {description}". Pictures are saved, so reloading never pays twice (`/api/draw`).
- **Guardrails:** the prompt always adds "no text, no logos, no people's faces", and user values are trimmed and cleaned before they go in.
- **Without a key:** a tidy placeholder tile shows the record's initial.

#### Muse Voice Transcribe: the ears

- **Model:** `muse-voice-transcribe-1.0`, `POST /v1/asr/transcribe`, push-to-talk mode. $3.00 per 1,000 minutes.
- **What it does:** hold to talk on a Hear block, or tap the mic on the describe screen. The browser records, converts to WAV (the only format the API takes, so we convert and test that), and sends it.
- **Limits we respect:** up to 10 minutes and 32 MB per recording. Our recorder stops at 60 seconds.
- **Without a key:** the mic is disabled and the form is still there to type into.

#### SAM 3.1: the eyes that count

- **Model:** SAM 3.1 through `POST /v1/responses`. The model page spells it `sam-3-1` and the docs spell it `sam-3.1`, so Prompt 14 checks the real name first. $2.50 per 1,000 images.
- **What it does:** you give it a photo and one short noun ("jar"), and it returns an outline and a box for every match, with a confidence score. For several nouns ("scratch", "chip", "missing veneer") we make one call per noun in parallel and color each noun's outlines differently. We decode the output with Meta's npm package `@meta-sam/parser`.
- **Where it shows up:** Maria's pantry count (saved over time, so a chart shows stock going down) and Cole's damage map (the counts feed his quote).
- **Early check:** on day 2 we try it on real photos. If "scratch" comes back weak, we switch to nouns that work before filming.
- **Without a key:** the photo still saves and you type the counts.

#### Muse Spark Open and Muse Glimmer: open weights

- **Muse Spark Open:** about 816B parameters with about 42B active at a time. It reads images. It's far too big for a laptop, so we run it on a hosting provider paid for with the credits (Part 2).
- **Muse Glimmer:** 30B parameters, Apache 2.0, reads images, and is built for long-running local agents. It runs on one consumer GPU or a Mac.
- **What they do in Bottega:**
  1. **Private mode** (a toggle per app). Building and changing the app, and filling forms from voice, run on open weights we host ourselves instead of Meta's API. That's Muse Spark Open on the live site, or Glimmer when running on the laptop. Seeing, drawing and transcribing still need Meta's API, and the settings screen says so plainly.
  2. **Backup.** If Meta's API rate-limits or fails during building, editing or suggestions, we retry once on Muse Spark Open, and the screen says "Built with Muse Spark Open". This keeps a live demo alive.
- **How it's wired:** all of these accept the same OpenAI-style requests, so the code changes only the address, key and model name.

#### Muse Code: how we build it

- The 32 build prompts are written to paste into Muse Code one at a time: Muse Spark 1.3 for most of them, Muse Wonder for the heavy ones.
- **Only claim "built with Muse Code" in the submission if we really did.**

### Data handling rules for Meta's models

- **We use the `-contributor` variants of Muse Spark and Muse Wonder where they exist.** They're cheaper because Meta may use what's sent to improve its products. Because people's photos (for Teach), voice transcripts and text go through these calls, every photo, mic and describe control, and the sign-in page, shows one line: "Photos, voice and text you add may be used by Meta to improve its models." Prompt 11 confirms the exact ids. SAM, Muse Image and Voice Transcribe have no contributor variant that we found, so they stay on their standard ids.
- The model key stays on the server. The browser never sees it, and Prompt 32 checks the built files to prove it.
- A user can only send their own photos. Every route checks the photo sits in that user's folder.
- No personal information goes into prompts, headers or logs beyond what the user is actually asking about.

### Rough cost for the hackathon (from Meta's listed prices)

| Model | Our guess for building and filming | Cost |
|---|---|---|
| SAM 3.1 | ~200 images (several nouns per photo, lots of retries) | ~$0.50 |
| Muse Image | ~50 pictures | ~$0.50 |
| Voice Transcribe | ~60 minutes of talking | ~$0.18 |
| Muse Spark and Wonder | Builds, edits, suggestions, feature scoring | Price not on the pages we checked, so check the pricing page (contributor ids are the cheaper tier) |

The paid models are cheap at our scale. Spark and Wonder, which handle the text, are the cost to watch.

---

## Part 2: How we use the other services

### The partner credits (open-weight models)

Three providers are offering credits to *selected* participants to run Meta's open-weight models. We don't know yet which of them we'll get, so we apply to all three on day 1.

| Provider | Offer | What it is | How we'd use it |
|---|---|---|---|
| **Fireworks** | $25 credits + a workshop with Sinan Ozdemir | A hosted catalog of models behind an OpenAI-style API. **Lists both Muse Spark Open and Muse Glimmer** | **First choice.** Quickest start: pick the model, get a key, done. Runs Private mode and the backup |
| **Baseten** | $100 credits + 2M tokens/minute rate limit | Hosted model serving. Lists Muse Spark Open | **Second choice, or the backup's backup.** The big rate limit suits demo day, when calls bunch up |
| **Modal** | $100 credits, Endpoints, serverless GPUs, sandboxes, training tools | GPUs you program yourself. Lists Muse Spark Open as a partner | **Only if needed.** We'd deploy the model server ourselves (vLLM). That's more setup, so use it if Fireworks and Baseten fall through, or to host Glimmer on a GPU |

**What we use them for:** only the open-weight models, for the two jobs in Part 1: Private mode, and the backup when Meta's API is busy. They don't replace SAM, Muse Image or Voice Transcribe, which only Meta's API serves.

**Setup (Prompt 26):**
1. Get the key and the provider's exact model name for Muse Spark Open.
2. Put them in `OPEN_BASE_URL`, `OPEN_API_KEY` and `OPEN_MODEL`, in `.env.local` and in Vercel.
3. Check whether that endpoint supports structured JSON output and image input. If it doesn't, we ask for "only JSON" and our schema check stays the real gate.
4. For Glimmer on the laptop, use `LOCAL_BASE_URL` and `LOCAL_MODEL` (Ollama, LM Studio or llama.cpp), in `.env.local` only.

**If we get no credits:**
- Glimmer still runs on the laptop, so Private mode works locally (not on the live site).
- There's no automatic backup, so Meta's API is the only path for building and editing.
- Nothing else changes. The core demo doesn't depend on the credits.

**Use one provider, not three.** Wiring all three adds work and buys nothing for the demo. Set up the first one we get, and add a second only if rate limits bite.

### The services every app needs

These aren't AI models, but Bottega can't run without them. Meta's platform runs models only. It has no accounts, database or file storage.

| Service | What it does for Bottega | Cost |
|---|---|---|
| **Vercel** | Hosts the Next.js app: the pages, plus the server routes that call the models. The live URL for judges | Free tier to start. Check that the model routes' time limits fit the plan (Prompt 31) |
| **Supabase** (added through Vercel's Storage tab) | Accounts (magic-link email sign-in for "Build your own Bottega", plus anonymous guest copies for "Try as Maria" / "Try as Cole", deleted after 24 hours), the database where each user's apps and records live, and photo storage. Its row-level security is why Maria can never see Cole's data | Free tier |

### What we don't use, and why

- **Other AI providers' models** (OpenAI, Google and so on). Every AI job in Bottega runs on a Meta model. That's the point of the hackathon, and it's what the tooling score rewards.
- **Together AI and OpenRouter.** They also host Meta's open models, but we have no credits there, and one provider is enough.
- **Running Muse Spark Open ourselves.** At ~816B parameters it needs a data-center GPU cluster. The partners exist for exactly this.

---

## What we can truthfully say in the submission

- "Every AI feature in Bottega runs on Meta's models: Muse Spark designs and edits each app, Muse Wonder suggests improvements, SAM 3.1 sees and counts, Muse Voice Transcribe hears, and Muse Image draws."
- "Private mode runs on Meta's open-weight models, Muse Spark Open hosted on [provider] and Muse Glimmer on the laptop, and Muse Spark Open also backs up the API during heavy use." *(Only once Prompt 26 is built and checked.)*
- "Each user also trains their own small model on their own photos, with visible dials and confidence."
- "Built with Muse Code." *(Only if true.)*

## Still to confirm

- [ ] The SAM 3.1 model name: `sam-3.1` or `sam-3-1` (Prompt 14).
- [ ] The structured-output rules on Meta's API: are unions supported? (Prompt 12)
- [ ] Muse Image's response format and sizes (Prompt 22).
- [ ] How to send a photo to Muse Spark (Prompt 20).
- [ ] The Voice Transcribe response field for the transcript (Prompt 18).
- [ ] Muse Spark and Wonder prices.
- [ ] Which credits we were approved for, and that provider's model name, JSON-output and image support (Prompt 26).
- [ ] Glimmer's memory needs on our laptop at our chosen quantization (Prompt 26).
- [ ] The official judging rules, once published.
