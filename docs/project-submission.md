## Submit Project

Which track are you submitting to?*This field is required.

Answer: TBD on the form itself — pick the main build track, plus the
Most Viral Track via the X post link below.

Which problem statement did you build towards?*This field is required.

- Build for your world (PICK THIS)
- Build the frontier

If you're competing for the Most Viral Track, please submit your X post link here to be considered.

Answer: TBD — post after filming, per docs/x_hype_video.md.

Project Description*

Answer:

Bottega is a workshop that builds each person a real, working app from
Meta-powered blocks, shaped around their life. Tap "Build your own
Bottega," describe your world ("I bake for cafés and take custom cake
orders…"), and Bottega designs your app: a JSON spec of your data,
screens, and blocks, written and edited by Muse Spark and rendered by
our runtime — we never generate or run arbitrary code. Blocks cover
everyday records (list, form, stat), seeing (SAM 3.1 counts objects in
photos), hearing (voice fills forms), pricing, before/after sharing,
drawing (AI pictures), and teaching — users train their own tiny
quality-checker on their photos. The loop is describe → build → use →
teach → grow: ask for changes in words or accept Muse Wonder
suggestions; every change is a validated spec diff, never a rebuild.
Hardware projects go further: a downloadable RFQ pack (brief, CAD,
drawings) sent to real US shops, a promise-date countdown with overdue
nudges, photo-proven arrival, and a human sourcing concierge when no
supplier fits. Two demo worlds prove it — Maria's bakery and Cole's
restoration bench — and every visitor gets a fresh private Try-as copy,
no sign-up.

3-Minute Demo Video*

Answer: film per docs/demo_video.md, upload, paste the link here.

Describe your use of Meta products to build the submitted project*

Answer:

Muse Spark (muse-spark-1.3-contributor): designs app specs from
descriptions (structured output, Zod-validated with a repair pass);
edits via spec-diff ops with preview/accept/undo; fills forms from
voice transcripts; scores teach-block photos on user-defined qualities;
powers the apprentice talk bar. Muse Wonder (muse-wonder-1.0): suggests
up to 3 app improvements from anonymized usage events, as validated
ops. SAM 3.1 (sam-3.1): the see block — outlines and counts objects per
noun via @meta-sam/parser; counts are user-correctable and saved to
records. Muse Voice Transcribe: the hear block, describe-screen
dictation, and talk-bar mic. Muse Image: the draw block and project
visuals. Muse Spark Open on Fireworks: private mode (build/edit/
voice-fill on open weights, never Meta's API) plus automatic fallback
on 429/5xx; a local Glimmer endpoint is also supported. Every photo,
mic, and describe control carries a contributor-model data notice.

Why are Meta's models important to your solution?*

Answer:

One model family across text, vision, voice, and image means one
integration instead of four vendors — and structured output is what
makes machine-checked app specs reliable enough to render without human
review. The open weights are the other half: private mode (Spark Open,
Glimmer local) lets sensitive work stay on our own infrastructure while
keeping the same prompts and behavior. Without hosted-frontier-plus-
open-weights from the same family, Bottega would be either less capable
or less private.

Provide feedback from your experience using partner technologies.

Answer:

Fireworks: Muse Spark Open verified working through our
OpenAI-compatible provider switch (structured JSON request, ~1.4s,
schema check passed). Baseten and Modal credits listed but not yet
exercised — the provider abstraction takes any OpenAI-compatible base
URL, so they're plug-in. On the app stack: Supabase's built-in email
rate limits forced a custom SMTP setup for magic links; otherwise
Supabase Auth/RLS/Storage plus Vercel hosting were solid.

What was the biggest obstacle your team hit while building this project?

- Getting access or setting up our account
- Finding clear documentation or code examples
- Connecting to our framework or other tools (Recommended)
- Code or answers from the model that were wrong or not useful
- The model not following our instructions
- A model capability we needed was missing
- Slow responses
- Errors
- outages or unreliable service
- Rate limits or usage limits (Recommended — Supabase email limits were
  the biggest time sink of the build)
- Muse Code losing track or stalling on longer tasks
- Muse Code changing things we didn't ask it to
- A Muse Code capability we needed was missing (please specify)
- Something else (please specify)
- We didn't hit any obstacles

Compared with other AI models your team has used for the same kind of work, how did Meta’s models perform on this project?

YOUR PICK (no recommendation — this is your experience):

- Much better
- Somewhat better
- About the same
- Somewhat worse
- Much worse
- We’ve used other models
- but couldn’t make a clear comparison
- We haven’t used other models for this kind of work

When your team chooses an AI model or coding tool, what matters most?

YOUR PICK:

- Quality of the answers and code
- Speed
- Price
- Handling long context
- such as big documents or codebases
- Agent abilities
- such as tool calling and multi-step tasks
- Reliability and uptime
- Easy integration
- such as SDKs or an OpenAI-compatible API
- Fits our editor and workflow
- Data privacy and terms of use
- Open weights or self-hosting
- High enough rate limits
- Something else (please specify)

Please specifiy below what matters most when choosing an AI model or coding tool

Answer: fill in after the pick above.

What makes it hardest for your team to switch to a different AI model or coding tool?

YOUR PICK:

- Our product is tuned to our current model's behavior and prompts
- Testing a new model takes too long
- Integration work such as new APIs SDKs or formats
- Our team already knows our current tool
- Contracts, credits or commitments with our current provider
- Getting a new vendor approved, such as security, legal or procurement
- Our data or fine-tuned models are tied to our current provider
- Features we rely on that other providers don’t offer
- Something else (please specify)
- Nothing, switching is easy for us

If your team took this project to production, what would most likely stop you from using Meta’s models?

- Model quality isn’t good enough yet for our use case
- Price or unpredictable costs (Selected — keep if this is your real
  answer; it reads as "quality isn't the blocker")
- Rate limits or capacity too low for real traffic
- Reliability or uptime
- How our data and our users’ data would be stored or used
- Security or compliance requirements, such as SOC 2
- Not available in our country or region
- Not available through our cloud provider, such as AWS, Azure or Google Cloud
- Missing production features, such as batch processing or spending limits
- Not sure Meta will keep supporting the API long term
- Something else (please specify)
- Nothing would stop us
- We don’t plan to take this project to production
