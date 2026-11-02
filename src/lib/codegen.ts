import { z } from "zod";
import type { AppSpec, Block } from "./spec/schema";

/** Replit-style export: real standalone code generated from the spec.
 *  Pure: prompt building + file validation. The route calls the model;
 *  the client zips the files. Generated code NEVER runs inside Bottega —
 *  it is only ever downloaded. */

export type FormFactor = "mobile" | "desktop";

export const CODEGEN_PATHS = [
  "index.html",
  "styles.css",
  "app.js",
  "README.txt",
] as const;
export const CODEGEN_FILE_MAX = 60000;
export const CODEGEN_TOTAL_MAX = 200000;

export const CodegenFilesSchema = z.object({
  files: z
    .array(
      z.object({
        path: z.string().min(1).max(32),
        content: z.string().min(1).max(CODEGEN_FILE_MAX),
      }),
    )
    .min(1)
    .max(4),
});
export type CodegenFiles = z.infer<typeof CodegenFilesSchema>;

export function validateCodegenFiles(
  files: { path: string; content: string }[],
  expected: readonly string[] = CODEGEN_PATHS,
): { ok: true; files: { path: string; content: string }[] } | { ok: false; issues: string[] } {
  const issues: string[] = [];
  const seen = new Set<string>();
  let total = 0;
  for (const f of files) {
    if (seen.has(f.path)) issues.push(`duplicate file '${f.path}'`);
    seen.add(f.path);
    if (f.path.includes("/") || f.path.includes("\\") || f.path.includes("..")) {
      issues.push(`bad path '${f.path}'`);
    }
    if (!(CODEGEN_PATHS as readonly string[]).includes(f.path)) {
      issues.push(`unexpected file '${f.path}'`);
    }
    if (f.content.trim() === "") issues.push(`empty file '${f.path}'`);
    total += f.content.length;
  }
  for (const p of expected) {
    if (!seen.has(p)) issues.push(`missing file '${p}'`);
  }
  if (total > CODEGEN_TOTAL_MAX) issues.push("files too large");
  const html = files.find((f) => f.path === "index.html");
  if (html && !/html/i.test(html.content)) {
    issues.push("index.html is not an HTML document");
  }
  if (issues.length > 0) return { ok: false, issues };
  return { ok: true, files };
}

const SYSTEM = `You write small, working, dependency-free web apps. You output files as JSON, never explanations.

HARD RULES — the app must work by double-clicking index.html with the wifi off:
- Exactly four files: index.html, styles.css, app.js, README.txt. No other paths.
- No external anything: no CDN, no fonts, no images, no fetch, no backend, no keys, no login. System fonts only.
- Vanilla HTML, CSS and JS only. No build step, no modules, no import statements. One <script src="app.js"> and one <link> to styles.css.
- Records persist in localStorage under one key per collection. IDs via Date.now plus Math.random.
- Every input has a <label>. Buttons are real <button> elements.

BLOCK MAP — build each screen's blocks from the design below:
- list: cards of the collection's records, newest first, with the listed fields.
- form: labeled inputs per field type (text, number, date, select for choice, checkbox for bool, file input for photo stored as a data URL); Save adds a record.
- stat: the count/sum/latest/avg over the collection, big number, plain words.
- price: pick a record, table of qty × rate lines with editable rates, total. Amounts in integer cents.
- compare: before/after file inputs saved onto the record, side by side, caption heading.
- see: file input plus one number input per noun for hand counts (on-device counting is out of scope for a first pass — say so in one muted line).
- hear: the same fields as a typed form (voice fill runs in Bottega — say so in one muted line).
- teach, draw, make: one honest placeholder card each ("Loaf checker runs in Bottega" style, using the block's own title). Never fake their output.
- README.txt: what the app does, how to open it, that data stays in this browser, and which blocks are placeholders.`;

function blockBrief(b: Block): Record<string, unknown> {
  const base: Record<string, unknown> = { type: b.type, title: b.title };
  switch (b.type) {
    case "list":
      return { ...base, collection: b.collection, show: b.show };
    case "form":
    case "hear":
      return { ...base, collection: b.collection, fields: b.fields };
    case "stat":
      return { ...base, collection: b.collection, field: b.field, agg: b.agg };
    case "see":
      return { ...base, nouns: b.nouns };
    case "price":
      return { ...base, collection: b.collection, lines: b.lines, currency: b.currency };
    case "compare":
      return { ...base, collection: b.collection, caption: b.caption ?? null };
    case "teach":
      return { ...base, question: b.question, labels: b.labels };
    case "draw":
      return { ...base, collection: b.collection };
    case "make":
      return { ...base, kind: b.kind };
  }
}

function fieldBrief(c: AppSpec["collections"][number]): string {
  return c.fields
    .map((f) =>
      f.type === "choice"
        ? `${f.name} [${f.id}] (choice: ${(f.options ?? []).join("/")})`
        : `${f.name} [${f.id}] (${f.type})`,
    )
    .join(", ");
}

export function buildCodegenPrompt(
  spec: AppSpec,
  formFactor: FormFactor,
): { system: string; user: string } {
  const layout =
    formFactor === "mobile"
      ? "LAYOUT: mobile-first, 390px wide. Screens switch through a bottom tab bar with short titles. Big touch targets, no horizontal scroll."
      : "LAYOUT: desktop. Responsive up to a 1100px column, screens switch through a top nav row. Comfortable spacing, two-column grids where they fit.";
  const screens = spec.screens.map((s) => ({
    title: s.title,
    blocks: s.blocks.map(blockBrief),
  }));
  const data = spec.collections.map((c) => `${c.name}: ${fieldBrief(c)}`).join("\n");
  const user = [
    `APP: ${spec.name} — ${spec.tagline}`,
    layout,
    `SCREENS:\n${JSON.stringify(screens, null, 1)}`,
    `DATA:\n${data}`,
    "Write the four files now. First pass: small and working beats complete.",
  ].join("\n\n");
  return { system: SYSTEM, user };
}
