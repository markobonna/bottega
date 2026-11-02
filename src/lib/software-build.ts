import { z } from "zod";

import type { FormFactor } from "./codegen";

/** Spark builds software directly: a designed, working first-pass app from
 *  the user's own words. No block catalog, no straitjacket — the model is
 *  the designer and the engineer. Pure: prompts, validation, state, preview
 *  inlining. The model calls live in software-server.ts (server-only).
 *  Generated code runs ONLY in a sandboxed iframe (no same-origin: it
 *  cannot touch the Bottega session, cookies or DOM) or from the
 *  downloaded file — never as part of our pages. */

const filesLine = (n: string) =>
  `Reply with ONLY the ${n} files as JSON: { files: [{ path, content }] }.`;

export const SOFTWARE_DESIGN_SYSTEM = `You are a senior product designer. You design the LOOK of a small, beautiful web app from the person's description, and you output it as files — never explanations. Behavior comes in the next phase; yours is the Blueprint: static, gorgeous, complete.

HARD RULES:
- Exactly two files: index.html, styles.css. No other paths.
- No external anything: no CDN, no fonts, no images, no fetch. System fonts only. Inline SVG for icons.
- Vanilla HTML + CSS only. One <link href="styles.css">. ALSO include one <script src="app.js"></script> tag — the behavior plugs into that tag in the next phase, so write no JavaScript yourself.
- Every button, input and nav item gets a stable id or data-action, because the next phase wires behavior to THIS html without rewriting it.
- Design it like you mean it: a real visual identity (your own tasteful palette, spacing, type scale), 2 to 5 screens as <section> blocks with in-app navigation, labeled inputs, real <button> elements, empty states with plain words. Static navigation is fine (simple :target or stacked sections) — the next phase wires the real thing. Navigation stays in the page: buttons and # anchors only, never links to a URL.
- Shape the person's actual flows from their description — upload slots, stage trackers, logs over time. Multi-step flows beat a single form.
- FIRST PASS, said honestly: small and beautiful beats complete. Structure honest local versions for anything a static file genuinely cannot do (typed entries instead of voice, hand counts instead of AI counting, export buttons instead of publishing) and mark each gap in one muted line. Never structure a faked integration.
- SIZE BUDGET — this has to fit in ONE reply: keep both files under ~200 lines total. Tight CSS, no repeated boilerplate, short comments or none.

${filesLine("two")}`;

export const SOFTWARE_PROTOTYPE_SYSTEM = `You are a senior frontend engineer. You get a designed app — its HTML and CSS — plus the person's original idea. You bring it to life: the JavaScript and the readme. Never explanations, never a redesign: wire THIS html.

HARD RULES — the app must work by double-clicking index.html with the wifi off, and inside a sandboxed preview with no storage:
- Exactly two files: app.js, README.txt. No other paths. Do NOT rewrite the HTML or CSS.
- Vanilla JS only. No modules, no import statements. One script, plugged into the <script src="app.js"> tag already in the HTML.
- Wire every button, input and nav item to the ids in the given HTML. If an id you need is missing, wire what exists — never invent elements. Everything happens in the page: handle form submits in JS (never a submit to a URL), never navigate (no location.href, no link to a URL).
- Storage: persist records in localStorage under one key per thing stored — BUT wrap every localStorage call in try/catch with an in-memory fallback, because the preview sandbox may block storage. The app must fully work either way. IDs via Date.now plus Math.random.
- FIRST PASS, said honestly: small and working beats complete. Build the honest local version for anything a static file genuinely cannot do, and say what runs in Bottega in one muted line per gap. Never fake an integration: no mock "Published!" confirmations for actions that didn't happen.
- README.txt: what the app does, how to open it, that data stays in this browser, and what to ask for next.
- SIZE BUDGET — this has to fit in ONE reply: keep both files under ~150 lines total. Tight code, short comments or none.

${filesLine("two")}`;

export const SOFTWARE_REVISE_SYSTEM = `You revise a small working web app from the person's request. You get the current files and one change request. Return the FULL updated file set — every file, complete — never a diff, never explanations.

HARD RULES:
- Exactly the files you were given: same paths, all of them, complete. No other paths, no dropped files.
- Same constraints as the original build: vanilla only, no external anything, system fonts, try/catch storage with in-memory fallback.
- Make the smallest change that does what the person asked. Keep everything else working exactly as it was.
- Keep ids and storage keys stable so their saved data survives the update.
- Update README.txt when the app's behavior changes, if README.txt is among the files.

${filesLine("given")}`;

const MAX_BRIEF = 1500;

function layoutLine(formFactor: FormFactor): string {
  return formFactor === "mobile"
    ? "FORM: a mobile app, 390px wide. Bottom tab bar with short titles, big touch targets, no horizontal scroll. It must look and feel like a real phone app."
    : "FORM: a desktop app. Responsive up to a 1100px column, top nav row, comfortable spacing, two-column grids where they fit. It must look and feel like a real desktop app.";
}

export function buildSoftwareDesignPrompt(
  description: string,
  formFactor: FormFactor,
): { system: string; user: string } {
  const user = [
    `APP IDEA (the person's own words): ${description.slice(0, MAX_BRIEF)}`,
    layoutLine(formFactor),
    "Design it and write the two files now. First pass: small, beautiful, static — behavior comes next.",
  ].join("\n\n");
  return { system: SOFTWARE_DESIGN_SYSTEM, user };
}

export function buildSoftwarePrototypePrompt(
  description: string,
  formFactor: FormFactor,
  design: { path: string; content: string }[],
): { system: string; user: string } {
  const user = [
    `APP IDEA (the person's own words): ${description.slice(0, MAX_BRIEF)}`,
    layoutLine(formFactor),
    `CURRENT DESIGN — wire THIS html, do not redesign it:\n${JSON.stringify(design)}`,
    "Write app.js and README.txt now. First pass: small, working, honest.",
  ].join("\n\n");
  return { system: SOFTWARE_PROTOTYPE_SYSTEM, user };
}

export function buildSoftwareRevisePrompt(
  files: { path: string; content: string }[],
  request: string,
): { system: string; user: string } {
  const user = [
    `CHANGE REQUEST: ${request.slice(0, 400)}`,
    `CURRENT FILES:\n${JSON.stringify(files)}`,
    "Return the full updated file set now.",
  ].join("\n\n");
  return { system: SOFTWARE_REVISE_SYSTEM, user };
}

export type SoftwareFiles = { path: string; content: string }[];

/** Merge generated files into the stored set by path: incoming wins,
 *  untouched files survive. The prototype phase adds app.js + README
 *  to the design's HTML + CSS this way. */
export function mergeSoftwareFiles(
  existing: SoftwareFiles,
  incoming: SoftwareFiles,
): SoftwareFiles {
  const next = new Map(existing.map((f) => [f.path, f.content]));
  for (const f of incoming) next.set(f.path, f.content);
  return [...next].map(([path, content]) => ({ path, content }));
}

export const SoftwareFilesStateSchema = z.object({
  files: z.array(z.object({ path: z.string(), content: z.string() })),
  formFactor: z.enum(["mobile", "desktop"]),
  via: z.enum(["meta", "open"]),
  updatedAt: z.string(),
  history: z
    .array(
      z.object({
        files: z.array(z.object({ path: z.string(), content: z.string() })),
        summary: z.string(),
        at: z.string(),
      }),
    )
    .max(10),
});
export type SoftwareFilesState = z.infer<typeof SoftwareFilesStateSchema>;

export function parseSoftwareFilesState(value: unknown): SoftwareFilesState | null {
  const result = SoftwareFilesStateSchema.safeParse(value);
  return result.success ? result.data : null;
}

/** Preview-only guard: a srcDoc frame inherits our page as its base URL,
 *  so a link or form submit in the generated app would load Bottega
 *  inside itself. This traps full navigations in the capture phase
 *  while leaving # anchors and the app's own JS handlers alone. It is
 *  injected into the preview document only — never the download. */
const PREVIEW_GUARD = `<script>document.addEventListener("click",function(e){var t=e.target&&e.target.closest?e.target.closest("a[href]"):null;if(t&&(t.getAttribute("href")||"").charAt(0)!=="#")e.preventDefault()},true);document.addEventListener("submit",function(e){e.preventDefault()},true);</script>`;

/** Inline styles.css + app.js into index.html so the app previews from one
 *  document (srcDoc has no sibling files). Pure; the download keeps the
 *  four separate files. */
export function inlineFiles(files: SoftwareFiles): string {
  const html = files.find((f) => f.path === "index.html")?.content ?? "";
  const css = files.find((f) => f.path === "styles.css")?.content ?? "";
  const js = files.find((f) => f.path === "app.js")?.content ?? "";
  const inlined = html
    .replace(
      /<link[^>]*href=["']styles\.css["'][^>]*>/i,
      () => `<style>\n${css}\n</style>`,
    )
    .replace(
      /<script[^>]*src=["']app\.js["'][^>]*>\s*<\/script>/i,
      () => `<script>\n${js.replace(/<\/script/gi, "<\\/script")}\n</script>`,
    );
  if (/<head[^>]*>/i.test(inlined)) {
    return inlined.replace(/<head[^>]*>/i, (m) => `${m}\n${PREVIEW_GUARD}`);
  }
  return `${PREVIEW_GUARD}\n${inlined}`;
}

/** File names whose content differs — the plain-words preview of a revision. */
export function changedFilePaths(
  before: SoftwareFiles,
  after: SoftwareFiles,
): string[] {
  const prev = new Map(before.map((f) => [f.path, f.content]));
  const out: string[] = [];
  for (const f of after) {
    if (prev.get(f.path) !== f.content) out.push(f.path);
  }
  return out;
}
