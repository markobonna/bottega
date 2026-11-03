You are building "Bottega", a workshop that builds each person's world with them — software they download and run, hardware a real shop can quote. It is for the Meta Global AI Developer Hackathon (due Nov 4, 2026, 9:00 PM ET). Judging weights from the earlier brief, provisional until the official rules are published: Impact 30%, Use of Meta AI tooling 25%, Demo 25%, Technical depth 20%.

THE IDEA
- A person's Bottega is a world of up to 4 workshops; each workshop holds projects. A footer talk bar (type, or hold-to-talk voice — voice in, voice out) routes everything: describe what to make, pick hardware or software when asked, walk it to done.
- Six trades: hardware, software, print, music, dance, recipe. Every project walks steps — Sketch · Design · Pack · Send RFQ · It arrived for hardware (print/music/dance/recipe vary the middle), Sketch · Prototype · Download for software.
- Software: Muse Spark writes the actual app — HTML/CSS design first (the static Blueprint), then JavaScript wired to it (the running Prototype) — previewed live in a sandboxed iframe, revised in words via file-level diffs, downloaded as a zero-dependency zip that runs outside Bottega.
- Hardware/print: B&W sketch, then the color render grown from it (Muse Image); an RFQ pack zip (brief, CAD, drawings); RFQs to real named shops; a promise-date countdown; photo-proven arrival. Margin notes are saved rows pinned to parts, and they ship inside the pack. A human sourcing concierge catches what no supplier fits.
- Two guest worlds prove it: Maria's (café, kitchen, studio projects incl. a trained loaf checker with a trick loaf) and Cole's (garage, store, kitchen incl. SAM damage counts and before/afters). Judges and visitors skip sign-up: "Try as Maria" / "Try as Cole" give each visitor a fresh private copy (Supabase anonymous sign-in), wiped on exit.
- Bottega is NOT a chatbot, advice machine, RAG app, dashboard or template builder. No chat box as the main way to use it. It never diagnoses, scores or ranks people. WhatsApp is plan-not-fiction: the app carries the maker's messaging plan to the shop, it never runs messages.

STACK
Next.js 16 App Router, React 19, TypeScript 5.9 (strict), Tailwind CSS 4 (@tailwindcss/postcss), Vitest, Zod 4, Supabase (@supabase/supabase-js + @supabase/ssr: Auth, Postgres with RLS, Storage), @meta-sam/parser. Muse Spark Open on Fireworks through the same OpenAI-style client for Private mode and fallback (Glimmer-local endpoint supported). pnpm. Deployed on Vercel as bottega.vip; Supabase installed through the Vercel Marketplace. Fonts via next/font/google: Fraunces (display) and Atkinson Hyperlegible Next (body). No other UI libraries. Pin exact versions (no ^).

FOLDERS
src/app (pages, api routes, server actions) · src/components (design/ boards + rooms, runtime/, blocks/, workshop/) · src/lib (pure logic + tests; spec/, design/, supabase/, make/) · src/vendor/bottega (design system) · supabase/migrations · scripts (seed-demo, probes). Screen truth lives in docs/project_steps.md; guest contents in docs/maria-cole-projects.md.

RULES
1. Specs are data. Every spec is checked by src/lib/spec/schema.ts (Zod) before it is saved or rendered. Changes are ops (src/lib/spec/ops.ts), re-checked after applying, saved as a new version. Generated software files go through codegen validation instead.
2. Isolation lives in the database. Every table has owner = auth.uid() RLS; the media bucket is per-user by path. Never "fix" access in client code. Only src/lib/supabase/admin.ts reads the Supabase secret key, and only the seed script, the share page and the guest cleanup use it.
3. MODEL_API_KEY (and OPEN_API_KEY) are read only in server code (src/lib/meta.ts, imported only by src/app/api/*). Every AI feature still works, or says politely that it is off, without a key (routes return 503 and the UI says so). Muse Spark uses its "-contributor" id, so every screen where someone adds a photo, recording or text for a model shows <DataNotice/>: "Photos, voice and text you add may be used by Meta to improve its models."
4. src/lib/brain.ts is pure (no React, DOM or network) and tested.
5. All UI colors come from CSS variables in globals.css, exposed with @theme inline. No hard-coded UI colors in components.
6. Desktop first (1180px, mobile secondary): works light and dark, no horizontal scroll. Real buttons, labels on inputs, aria-pressed on toggles, visible focus. No window.alert/confirm/prompt; use inline confirmation.
7. No personal information anywhere: no real names, emails, usernames or machine details in code, commits, seed data, prompts or request headers. Demo accounts are maria@example.com and cole@example.com (templates; visitors get anonymous guest copies).
8. When a prompt says "confirm first", read the named doc page before writing code, and tell me what you found.
9. Do only what the current prompt asks. Tell me which files you created or changed, and how to run the check.
