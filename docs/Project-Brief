You are building "Bottega", a workshop that builds each person a real, working app from Meta-powered blocks, shaped around their life. It is for the Meta Global AI Developer Hackathon (due Nov 4, 2026, 9:00 PM ET). Judging weights from the earlier brief, provisional until the official rules are published: Impact 30%, Use of Meta AI tooling 25%, Demo 25%, Technical depth 20%.

THE IDEA
- A person taps "Build your own Bottega" (magic-link email), describes their world ("I bake for cafés and take custom cake orders…"), and Bottega builds them an app. The app is a SPEC: JSON listing collections (their data), screens and blocks. Muse Spark writes and edits the spec; our runtime renders it. We NEVER generate or run arbitrary code.
- Blocks: list, form, stat (everyday); see (SAM 3.1 outlines and counts objects in photos); hear (Muse Voice Transcribe, then Spark fills a form from speech); price (quote from counts × rates); compare (before/after with a share link); teach (the user trains their OWN small model on their photos, with dials, confidence and corrections); draw (Muse Image pictures for records); make (stretch: parametric shelf → STL/DXF).
- The loop: describe → build → use → teach → grow (ask for a change, or accept a Muse Wonder suggestion; changes are spec diffs, not rebuilds).
- Two demo worlds prove it: Maria (bakery: orders by voice, pantry counted from a photo, daily specials board with pictures, a loaf checker she trains) and Cole (furniture restorer: project log with photos, damage map, quote builder, before/after page for clients). Same platform, two different apps, two isolated accounts. Judges and visitors skip sign-up: "Try as Maria" / "Try as Cole" give each visitor a fresh private copy of that ready-made workshop (Supabase anonymous sign-in), deleted after 24 hours.
- Bottega is NOT a chatbot, advice machine, RAG app, dashboard or template builder. No chat box as the main way to use it. It never diagnoses, scores or ranks people.

STACK
Next.js 16 App Router, React 19, TypeScript 5.9 (strict), Tailwind CSS 4 (@tailwindcss/postcss), Vitest, Zod 4, Supabase (@supabase/supabase-js + @supabase/ssr: Auth, Postgres with RLS, Storage), @meta-sam/parser. Meta's open-weight models (Muse Spark Open on Fireworks/Baseten/Modal, Muse Glimmer locally) through the same OpenAI-style client, for Private mode and as a fallback. Deployed on Vercel; Supabase installed through the Vercel Marketplace. Fonts via next/font/google: Fraunces (display) and Atkinson Hyperlegible Next (body). No other UI libraries. Pin exact versions (no ^).

FOLDERS
src/app (pages, api routes, server actions) · src/components (runtime/, blocks/, workshop/) · src/lib (pure logic + tests, spec/, supabase/, make/) · supabase/migrations · scripts. The reference for every schema, table and route is "Bottega Components.md".

RULES
1. Specs are data. Every spec is checked by src/lib/spec/schema.ts (Zod) before it is saved or rendered. Changes are ops (src/lib/spec/ops.ts), re-checked after applying, saved as a new version.
2. Isolation lives in the database. Every table has owner = auth.uid() RLS; the media bucket is per-user by path. Never "fix" access in client code. Only src/lib/supabase/admin.ts reads the Supabase secret key, and only the seed script, the share page, the Try-as route (copying a template) and the guest cleanup use it.
3. MODEL_API_KEY (and OPEN_API_KEY) are read only in server code (src/lib/meta.ts, imported only by src/app/api/*). Every AI feature still works, or says politely that it is off, without a key (routes return 503 and the UI says so). Muse Spark and Muse Wonder use their "-contributor" model ids where they exist, so every screen where someone adds a photo, recording or text for a model shows <DataNotice/>: "Photos, voice and text you add may be used by Meta to improve its models."
4. src/lib/brain.ts is pure (no React, DOM or network) and tested.
5. All UI colors come from CSS variables in globals.css (light on :root, dark under prefers-color-scheme and [data-theme=dark]), exposed with @theme inline. No hard-coded UI colors in components.
6. Phone first: works at 390 px wide, light and dark, no horizontal scroll. Real buttons, labels on inputs, aria-pressed on toggles, visible focus. No window.alert/confirm/prompt; use inline confirmation.
7. No personal information anywhere: no real names, emails, usernames or machine details in code, commits, seed data, prompts or request headers.  (templates; visitors get anonymous guest copies).
8. When a prompt says "confirm first", read the named doc page before writing code, and tell me what you found.
9. Do only what the current prompt asks. Tell me which files you created or changed, and how to run the check.