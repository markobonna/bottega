import type { DbRecord } from "../records";
import type { AppSpec } from "../spec/schema";

/**
 * Assemble the downloadable app file: one self-contained HTML document
 * holding the spec, a seed of the records, and the standalone renderer
 * (standalone-boot.js, read from disk by the route). Pure; the route is
 * a thin authenticated wrapper around it.
 */

/** JSON for a <script type="application/json"> tag: escape < so no record
 *  value can break out of the tag. \u003c parses back to < exactly. */
export function embedJson(value: unknown): string {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}

export function escHtml(v: string): string {
  return v.replace(/[&<>"']/g, (c) => {
    return (
      { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[
        c
      ] ?? c
    );
  });
}

export type SeedRecord = { id: string; data: Record<string, unknown> };

/** Seed records for the file. Workshop photo values are storage paths or
 *  signed URLs that rot, so photo fields are stripped to "" — honest
 *  emptiness the file labels, not broken images. */
export function seedRecords(
  spec: AppSpec,
  records: Record<string, DbRecord[]>,
): Record<string, SeedRecord[]> {
  const photo = new Set<string>();
  for (const c of spec.collections) {
    for (const f of c.fields) {
      if (f.type === "photo") photo.add(`${c.id}:${f.id}`);
    }
  }
  const out: Record<string, SeedRecord[]> = {};
  for (const [collId, rows] of Object.entries(records)) {
    out[collId] = rows.map((r) => {
      const data: Record<string, unknown> = { ...(r.data as object) };
      for (const key of Object.keys(data)) {
        if (photo.has(`${collId}:${key}`)) data[key] = "";
      }
      return { id: r.id, data };
    });
  }
  return out;
}

export function standaloneCss(): string {
  return [
    ":root{--paper:#f6f1e7;--card:#fffdf8;--ink:#221c15;--muted:#6b5f50;",
    "--line:#e2d8c6;--accent:#b5532a;--ok:#2f7d4f;--bad:#b4441c}",
    "*{box-sizing:border-box}",
    "body{margin:0;background:var(--paper);color:var(--ink);",
    "font:16px/1.5 system-ui,-apple-system,Segoe UI,sans-serif}",
    ".sa-shell{max-width:720px;margin:0 auto;padding:20px 16px 64px}",
    ".sa-head{display:flex;gap:12px;align-items:flex-start;margin-bottom:16px}",
    ".sa-head h1{font-size:26px;margin:0}",
    ".sa-head p{margin:2px 0 0;color:var(--muted)}",
    ".sa-head .sa-ico{font-size:32px}",
    ".sa-v{margin-left:auto;font-size:13px;color:var(--muted);white-space:nowrap}",
    ".sa-tabs{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:16px}",
    ".sa-tabs button{border:1.5px solid var(--line);background:var(--card);",
    "color:var(--ink);border-radius:8px;padding:8px 12px;font-size:14px;cursor:pointer}",
    ".sa-tabs button.on{border-color:var(--ink);font-weight:700}",
    ".sa-block{background:var(--card);border:1.5px solid var(--line);",
    "border-radius:14px;padding:16px;margin-bottom:16px}",
    ".sa-block h3{margin:0 0 12px;font-size:18px}",
    ".sa-block h4{margin:12px 0 8px}",
    ".sa-list{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:8px}",
    ".sa-list>li{border:1.5px solid var(--line);border-radius:10px;overflow:hidden}",
    ".sa-list>li>button{display:flex;gap:12px;width:100%;text-align:left;background:none;",
    "border:0;padding:10px 12px;cursor:pointer;font-size:15px;color:var(--ink)}",
    ".sa-cell{display:flex;align-items:center;gap:6px}",
    ".sa-full{display:grid;grid-template-columns:110px 1fr;gap:4px 12px;",
    "margin:0;padding:10px 12px;border-top:1.5px dashed var(--line)}",
    ".sa-full dt{color:var(--muted);font-size:14px}",
    ".sa-full dd{margin:0}",
    ".sa-field{display:block;margin-bottom:12px}",
    ".sa-field>span{display:block;font-size:13px;font-weight:700;color:var(--muted);",
    "text-transform:uppercase;letter-spacing:.06em;margin-bottom:4px}",
    "input[type=text],input[type=number],input[type=date],input[type=password],",
    "select,textarea{width:100%;font-size:16px;padding:10px 12px;border-radius:8px;",
    "border:1.5px solid var(--line);background:#fff;color:var(--ink)}",
    'input[type=checkbox]{width:22px;height:22px}',
    'button{font-size:15px;font-weight:600;padding:10px 16px;border-radius:8px;',
    "border:1.5px solid var(--ink);background:var(--ink);color:var(--paper);cursor:pointer}",
    "button:disabled{opacity:.5;cursor:default}",
    ".sa-danger{background:none;color:var(--bad);border-color:var(--bad);margin:0 12px 12px}",
    ".sa-thumb{width:56px;height:56px;object-fit:cover;border-radius:8px}",
    ".sa-photo{width:100%;max-height:320px;object-fit:contain;border-radius:8px;",
    "border:1.5px solid var(--line)}",
    ".sa-ph{display:inline-block;width:56px;height:56px;border-radius:8px;",
    "background:repeating-conic-gradient(var(--line) 0 25%,transparent 0 50%) 0 0/16px 16px}",
    ".sa-ph-lg{display:block;width:100%;height:160px}",
    ".sa-chip{display:inline-block;padding:2px 10px;border-radius:999px;",
    "border:1.5px solid var(--line);font-size:13px}",
    ".sa-dim{color:var(--muted)}",
    ".sa-note{font-size:14px;color:var(--muted)}",
    ".sa-hint{font-size:14px;color:var(--muted);margin-top:0}",
    ".sa-ok{color:var(--ok);font-weight:600}",
    ".sa-err{color:var(--bad);font-weight:600}",
    ".sa-big{font-size:34px;font-weight:800;margin:4px 0 12px}",
    ".sa-spark{width:100%;height:90px}",
    ".sa-spark polyline{stroke:var(--accent)}",
    ".sa-table{width:100%;border-collapse:collapse;margin-bottom:8px}",
    ".sa-table th{text-align:left;font-size:13px;color:var(--muted);",
    "text-transform:uppercase;letter-spacing:.06em}",
    ".sa-table td,.sa-table th{padding:6px 8px;border-bottom:1px solid var(--line)}",
    ".sa-pair{display:grid;grid-template-columns:1fr 1fr;gap:12px}",
    ".sa-pair figure{margin:0}",
    ".sa-pair figcaption{font-size:13px;font-weight:700;color:var(--muted);margin-bottom:4px}",
    ".sa-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}",
    ".sa-card{border:1.5px solid var(--line);border-radius:10px;padding:10px;",
    "display:flex;flex-direction:column;gap:8px}",
    ".sa-card strong{font-size:15px}",
    ".sa-key{display:flex;gap:8px;align-items:flex-end;margin-bottom:12px}",
    ".sa-key label{flex:1}",
    ".sa-key input{margin-top:4px}",
    "blockquote{border-left:3px solid var(--accent);margin:12px 0;padding:4px 12px}",
    "footer{margin-top:24px;font-size:13px;color:var(--muted)}",
    "@media(max-width:560px){.sa-pair,.sa-grid{grid-template-columns:1fr}}",
  ].join("\n");
}

export function buildStandaloneHtml(opts: {
  appId: string;
  appName: string;
  version: number;
  spec: AppSpec;
  seed: Record<string, SeedRecord[]>;
  bootSrc: string;
}): string {
  const { appId, appName, version, spec, seed, bootSrc } = opts;
  const title = `${appName} — Bottega export`;
  return [
    "<!doctype html>",
    '<html lang="en">',
    "<head>",
    '<meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1">',
    `<title>${escHtml(title)}</title>`,
    "<style>",
    standaloneCss(),
    "</style>",
    "</head>",
    "<body>",
    '<div class="sa-shell">',
    '<header class="sa-head">',
    `<span class="sa-ico" aria-hidden="true">${escHtml(spec.look.icon)}</span>`,
    "<div>",
    `<h1>${escHtml(appName)}</h1>`,
    `<p>${escHtml(spec.tagline)}</p>`,
    "</div>",
    `<span class="sa-v">spec v${version}</span>`,
    "</header>",
    '<main id="sa-root"></main>',
    "<footer>Exported from Bottega. Your data lives in this browser — " +
      "change the design in the workshop and download again.</footer>",
    "</div>",
    `<script type="application/json" id="sa-spec">${embedJson(spec)}</script>`,
    `<script type="application/json" id="sa-seed">${embedJson(seed)}</script>`,
    `<div id="sa-meta" data-app="${escHtml(appId)}" data-version="${version}" hidden></div>`,
    "<script>",
    bootSrc,
    "</script>",
    "</body>",
    "</html>",
    "",
  ].join("\n");
}
