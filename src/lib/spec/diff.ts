import type { AppSpec, Block } from "./schema";

// Plain-words diff between two specs, for edit previews. Compared by id;
// order changes are noise and ignored.

export interface SpecDiff {
  added: string[];
  changed: string[];
  removed: string[];
}

const cap = (t: string): string => t.charAt(0).toUpperCase() + t.slice(1);

const blockLabel = (b: Block): string => `${cap(b.type)} · ${b.title}`;

// Whole block minus the bits that get their own lines (title, price lines).
function blockRest(b: Block): string {
  return JSON.stringify(b, (k, v: unknown) =>
    k === "title" || k === "lines" ? undefined : v,
  );
}

function diffBlock(oldB: Block, newB: Block): string[] {
  const out: string[] = [];
  if (oldB.title !== newB.title) {
    out.push(`Block title: ${oldB.title} → ${newB.title}`);
  }
  if (oldB.type === "price" && newB.type === "price") {
    const rates = new Map(newB.lines.map((l) => [l.field, l]));
    for (const l of oldB.lines) {
      const n = rates.get(l.field);
      if (!n) out.push(`Price · ${l.label} removed`);
      else if (n.rate !== l.rate) {
        out.push(`Price · ${l.label} rate ${l.rate} → ${n.rate}`);
      }
    }
    const oldFields = new Set(oldB.lines.map((l) => l.field));
    for (const l of newB.lines) {
      if (!oldFields.has(l.field)) out.push(`Price · ${l.label} added`);
    }
  }
  if (blockRest(oldB) !== blockRest(newB)) {
    out.push(`${cap(newB.type)} · ${newB.title} updated`);
  }
  return out;
}

export function diffSpecs(a: AppSpec, b: AppSpec): SpecDiff {
  const added: string[] = [];
  const changed: string[] = [];
  const removed: string[] = [];

  if (a.name !== b.name) changed.push(`App name: ${a.name} → ${b.name}`);
  if (a.tagline !== b.tagline) {
    changed.push(`App tagline: ${a.tagline} → ${b.tagline}`);
  }

  const aScreens = new Map(a.screens.map((s) => [s.id, s]));
  const bScreens = new Map(b.screens.map((s) => [s.id, s]));
  for (const s of b.screens) {
    if (!aScreens.has(s.id)) added.push(`Screen: ${s.title}`);
  }
  for (const s of a.screens) {
    const n = bScreens.get(s.id);
    if (!n) {
      removed.push(`Screen: ${s.title}`);
    } else {
      if (n.title !== s.title) {
        changed.push(`Screen title: ${s.title} → ${n.title}`);
      }
      if (n.icon !== s.icon) {
        changed.push(`Screen icon: ${s.icon} → ${n.icon}`);
      }
    }
  }

  const aBlocks = new Map(
    a.screens.flatMap((s) => s.blocks.map((bl) => [bl.id, { b: bl, screen: s.title }] as const)),
  );
  const bBlocks = new Map(
    b.screens.flatMap((s) => s.blocks.map((bl) => [bl.id, { b: bl, screen: s.title }] as const)),
  );
  for (const [id, { b, screen }] of bBlocks) {
    const old = aBlocks.get(id);
    if (!old) {
      added.push(`Block: ${blockLabel(b)}`);
      continue;
    }
    if (old.screen !== screen) {
      changed.push(`Block moved: ${b.title} → ${screen}`);
    }
    changed.push(...diffBlock(old.b, b));
  }
  for (const [id, { b }] of aBlocks) {
    if (!bBlocks.has(id)) removed.push(`Block: ${blockLabel(b)}`);
  }

  const aColls = new Map(a.collections.map((c) => [c.id, c]));
  const bColls = new Map(b.collections.map((c) => [c.id, c]));
  for (const c of b.collections) {
    if (!aColls.has(c.id)) {
      added.push(`Collection: ${c.name}`);
      continue;
    }
    const oldFields = new Map(aColls.get(c.id)?.fields.map((f) => [f.id, f]));
    const newFields = new Map(c.fields.map((f) => [f.id, f]));
    for (const f of c.fields) {
      if (!oldFields.has(f.id)) added.push(`Field: ${c.name} → ${f.name}`);
    }
    for (const f of oldFields.values()) {
      if (!newFields.has(f.id)) removed.push(`Field: ${c.name} → ${f.name}`);
    }
  }
  for (const c of a.collections) {
    if (!bColls.has(c.id)) removed.push(`Collection: ${c.name}`);
  }

  return { added, changed, removed };
}
