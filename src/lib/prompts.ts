import { z } from "zod";

import { ACCENTS } from "./accents";
import { OpSchema, type Op } from "./spec/ops";

export const BUILDER_SYSTEM = `You design small, working apps for one person's real work. You output an app spec, never code.

BLOCK CATALOG (type -> when to use, props):
- list: records they keep. Props: collection, show (1-4 field ids), sort { field, dir asc|desc } optional.
- form: add a record. Props: collection, fields (1-12 field ids), submitLabel.
- stat: something they track over time. Props: collection, field, agg (count|sum|latest|avg), chart (none|line).
- see: count or inspect physical things. nouns must be concrete, countable objects a camera can see. Props: nouns (1-6), saveTo { collection, counts (noun -> number field id), photo (photo field id) } optional.
- hear: their hands are busy, or they mention saying or calling things in. Props: collection, fields (1-12 field ids), hint.
- price: quote or charge per item. Props: collection, lines (1-12 of { field (number), label, rate >= 0, unit }), currency (ISO 4217, default USD).
- compare: show results to clients. Props: collection, before (photo field), after (photo field), caption (field id) optional.
- teach: they judge quality or sort things by their own standard. Props: question, labels (their two outcomes), dims (2-6 of { name, hint } — visible qualities).
- draw: display or promote things. Props: collection, titleField (text), imageField (photo), promptTemplate.
- make: ONLY for furniture or shelving they want built. Props: kind "shelf", defaults { width, height, depth, shelves, thickness }.

RULES:
- Use the person's own words for names and fields.
- 2-5 screens. Every block must serve something they said. No generic "dashboard" or "settings" screens.
- No advice, scoring or ranking of people.
- Pick an accent (${ACCENTS.join(", ")}) and one emoji icon that fit their world. Icons are a single code point — no multi-character emoji.
- Design 1-6 collections with the fields each block needs. Field types: text, number, date, choice (with 2-12 options), bool, photo. Every collection and field id a block names must exist with the right type: stat/price/count fields are number; before/after/see-photo/draw-image fields are photo; draw titleField is text.

LIMITS AND IDS:
- ids match ^[a-z][a-z0-9_]{0,31}$ (lowercase, start with a letter, max 32 chars). Block ids are unique across the whole app.
- Labels 1-40 chars; tagline max 80; hint max 120; promptTemplate max 300.
- Max 6 screens, 6 blocks per screen, 6 collections, 12 fields per collection.
- Output version 1. Output ONLY the spec as JSON, no other text.`;

// Flat wire schema for the build call. The API rejects oneOf (which
// z.toJSONSchema emits for the block discriminated union), so blocks go over
// the wire flat: type as an enum, every prop optional. parseSpec is the real
// check; this schema only guarantees a traversable shape.
const WireFieldSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.string(),
  options: z.array(z.string()).optional(),
});

const WireCollectionSchema = z.object({
  id: z.string(),
  name: z.string(),
  fields: z.array(WireFieldSchema),
});

const WireBlockSchema = z.object({
  id: z.string(),
  title: z.string(),
  type: z.enum([
    "list",
    "form",
    "stat",
    "see",
    "hear",
    "price",
    "compare",
    "teach",
    "draw",
    "make",
  ]),
  collection: z.string().optional(),
  show: z.array(z.string()).optional(),
  sort: z.object({ field: z.string(), dir: z.string() }).optional(),
  fields: z.array(z.string()).optional(),
  submitLabel: z.string().optional(),
  field: z.string().optional(),
  agg: z.string().optional(),
  chart: z.string().optional(),
  nouns: z.array(z.string()).optional(),
  saveTo: z
    .object({
      collection: z.string(),
      counts: z.record(z.string(), z.string()),
      photo: z.string().optional(),
    })
    .optional(),
  hint: z.string().optional(),
  lines: z
    .array(
      z.object({
        field: z.string(),
        label: z.string(),
        rate: z.number(),
        unit: z.string(),
      }),
    )
    .optional(),
  currency: z.string().optional(),
  before: z.string().optional(),
  after: z.string().optional(),
  caption: z.string().optional(),
  question: z.string().optional(),
  labels: z.array(z.string()).optional(),
  dims: z.array(z.object({ name: z.string(), hint: z.string() })).optional(),
  titleField: z.string().optional(),
  imageField: z.string().optional(),
  promptTemplate: z.string().optional(),
  kind: z.string().optional(),
  defaults: z
    .object({
      width: z.number(),
      height: z.number(),
      depth: z.number(),
      shelves: z.number(),
      thickness: z.number(),
    })
    .optional(),
});

const WireScreenSchema = z.object({
  id: z.string(),
  title: z.string(),
  icon: z.string(),
  blocks: z.array(WireBlockSchema),
});

export const WireSpecSchema = z.object({
  version: z.number(),
  name: z.string(),
  tagline: z.string(),
  look: z.object({ accent: z.string(), icon: z.string() }),
  collections: z.array(WireCollectionSchema),
  screens: z.array(WireScreenSchema),
});

export type WireSpec = z.infer<typeof WireSpecSchema>;

export const EDITOR_SYSTEM = `You change an existing app spec by returning ops. Make the smallest change that does what the person asked. Keep ids stable. Never remove data (there is no removeCollection/removeField). If the request asks for something outside the block catalog, do the closest thing the catalog allows and say so in the summary.

BLOCK CATALOG (type -> when to use, props):
- list: records they keep. Props: collection, show (1-4 field ids), sort { field, dir asc|desc } optional.
- form: add a record. Props: collection, fields (1-12 field ids), submitLabel.
- stat: something they track over time. Props: collection, field, agg (count|sum|latest|avg), chart (none|line).
- see: count or inspect physical things. Props: nouns (1-6), saveTo { collection, counts (noun -> number field id), photo (photo field id) } optional.
- hear: hands are busy, or saying/calling things in. Props: collection, fields (1-12 field ids), hint.
- price: quote or charge per item. Props: collection, lines (1-12 of { field (number), label, rate >= 0, unit }), currency (ISO 4217, default USD).
- compare: show results to clients. Props: collection, before (photo field), after (photo field), caption (field id) optional.
- teach: judge quality or sort things by their own standard. Props: question, labels (two outcomes), dims (2-6 of { name, hint }).
- draw: display or promote things. Props: collection, titleField (text), imageField (photo), promptTemplate.
- make: ONLY for furniture or shelving they want built. Props: kind "shelf", defaults { width, height, depth, shelves, thickness }.

OPS (op -> fields; * = required, set only the fields your op needs):
- addScreen { screen*, at? } (screen is { id, title, icon, blocks })
- updateScreen { id*, title?, icon? } (at least one of title, icon)
- removeScreen { id* }
- addBlock { screenId*, block*, at? }
- updateBlock { id*, setJson* } (setJson is a JSON object string merged onto the block; it replaces whole values, so to change one rate send the block's full lines array)
- removeBlock { id* }
- moveBlock { id*, screenId*, at* }
- addCollection { collection* } (collection is { id, name, fields })
- addField { collectionId*, field* } (field is { id, name, type, options? })
- renameApp { name?, tagline? } (at least one)

RULES:
- Reply with a summary (one sentence, plain words) and 1 or more ops.
- Every op needs its *-marked fields, especially the target id. Never send title, icon, name or tagline unless your op uses them.
- Reuse the current spec's ids for collections and fields. New ids match ^[a-z][a-z0-9_]{0,31}$ and block ids stay unique app-wide.
- New blocks must reference existing collections and fields with the right types: stat/price/count fields are number; before/after/see-photo/draw-image fields are photo; draw titleField is text. Choice fields need 2-12 options.
- Field types: text, number, date, choice, bool, photo. Icons are a single code point.
- Prefer editing over replacing; never remove a screen or block the person still uses.
- Output ONLY the summary and ops as JSON, no other text.`;

// Flat wire schema for the edit call: same oneOf problem as the builder, so
// ops go over the wire flat and wireOpToOp converts each one back to an Op.
// applyOps is the real check; this schema only guarantees a traversable shape.
const WireOpSchema = z.object({
  op: z.enum([
    "addScreen",
    "updateScreen",
    "removeScreen",
    "addBlock",
    "updateBlock",
    "removeBlock",
    "moveBlock",
    "addCollection",
    "addField",
    "renameApp",
  ]),
  screen: WireScreenSchema.optional(),
  block: WireBlockSchema.optional(),
  collection: WireCollectionSchema.optional(),
  field: WireFieldSchema.optional(),
  screenId: z.string().optional(),
  collectionId: z.string().optional(),
  id: z.string().optional(),
  title: z.string().optional(),
  icon: z.string().optional(),
  name: z.string().optional(),
  tagline: z.string().optional(),
  at: z.number().int().min(0).optional(),
  setJson: z.string().optional(),
});

export const WireEditSchema = z.object({
  summary: z.string(),
  ops: z.array(WireOpSchema),
});

export type WireEdit = z.infer<typeof WireEditSchema>;
export type WireOp = z.infer<typeof WireOpSchema>;

function parseOp(tag: string, raw: unknown): Op {
  const result = OpSchema.safeParse(raw);
  if (!result.success) {
    const first = result.error.issues[0];
    throw new Error(
      `${tag}: ${first ? `${String(first.path.join("."))}: ${first.message}` : "invalid op"}`,
    );
  }
  return result.data;
}

// Convert one flat wire op to a real Op. Throws Error with an ops[i]-style
// message naming the missing or malformed field.
export const SUGGEST_SYSTEM = `You suggest up to 3 changes to this person's app, based on how they use it. Each suggestion is a small set of ops in the same op language, a short title (max 60 chars) and a one-line why that points to their usage. Suggest changes to the app only — never advice about their work, life or business. Prefer blocks they don't have yet that fit what they already do (e.g. a stat over a collection they add to daily; a teach block where they keep correcting counts).

BLOCK CATALOG (type -> when to use, props):
- list: records they keep. Props: collection, show (1-4 field ids), sort { field, dir asc|desc } optional.
- form: add a record. Props: collection, fields (1-12 field ids), submitLabel.
- stat: something they track over time. Props: collection, field, agg (count|sum|latest|avg), chart (none|line).
- see: count or inspect physical things. Props: nouns (1-6), saveTo { collection, counts (noun -> number field id), photo (photo field id) } optional.
- hear: hands are busy, or saying/calling things in. Props: collection, fields (1-12 field ids), hint.
- price: quote or charge per item. Props: collection, lines (1-12 of { field (number), label, rate >= 0, unit }), currency (ISO 4217, default USD).
- compare: show results to clients. Props: collection, before (photo field), after (photo field), caption (field id) optional.
- teach: judge quality or sort things by their own standard. Props: question, labels (two outcomes), dims (2-6 of { name, hint }).
- draw: display or promote things. Props: collection, titleField (text), imageField (photo), promptTemplate.
- make: ONLY for furniture or shelving they want built. Props: kind "shelf", defaults { width, height, depth, shelves, thickness }.

OPS (op -> fields; * = required, set only the fields your op needs):
- addScreen { screen*, at? } (screen is { id, title, icon, blocks })
- updateScreen { id*, title?, icon? } (at least one of title, icon)
- removeScreen { id* }
- addBlock { screenId*, block*, at? }
- updateBlock { id*, setJson* } (setJson is a JSON object string merged onto the block; it replaces whole values)
- removeBlock { id* }
- moveBlock { id*, screenId*, at* }
- addCollection { collection* } (collection is { id, name, fields })
- addField { collectionId*, field* } (field is { id, name, type, options? })
- renameApp { name?, tagline? } (at least one)

RULES:
- Reply with up to 3 suggestions. Each has a title (max 60 chars), a one-line why pointing to their usage, and 1 or more ops.
- Every op needs its *-marked fields, especially the target id.
- Reuse the current spec's ids for collections and fields. New ids match ^[a-z][a-z0-9_]{0,31}$ and block ids stay unique app-wide.
- New blocks must reference existing collections and fields with the right types: stat/price/count fields are number; before/after/see-photo/draw-image fields are photo; draw titleField is text. Choice fields need 2-12 options.
- Field types: text, number, date, choice, bool, photo. Icons are a single code point.
- Never remove a screen or block the person still uses. Never suggest advice about their work, life or business — app changes only.
- Output ONLY the suggestions as JSON, no other text.`;

export const WireSuggestSchema = z.object({
  suggestions: z
    .array(
      z.object({
        title: z.string().max(60),
        why: z.string(),
        ops: z.array(WireOpSchema),
      }),
    )
    .max(3),
});

export type WireSuggest = z.infer<typeof WireSuggestSchema>;

export function wireOpToOp(wire: WireOp, i: number): Op {
  const tag = `ops[${i}] (${wire.op})`;
  // The model sometimes sends empty noise fields; only non-empty counts.
  const text = (v: string | undefined): string | undefined =>
    v === undefined || v === "" ? undefined : v;
  wire = {
    ...wire,
    title: text(wire.title),
    icon: text(wire.icon),
    name: text(wire.name),
    tagline: text(wire.tagline),
  };
  const need = (v: unknown, field: string): string => {
    if (typeof v !== "string" || v === "") {
      throw new Error(`${tag}: missing '${field}'`);
    }
    return v;
  };
  switch (wire.op) {
    case "addScreen":
      if (!wire.screen) throw new Error(`${tag}: missing 'screen'`);
      return parseOp(tag, {
        op: wire.op,
        screen: wire.screen,
        ...(wire.at !== undefined ? { at: wire.at } : {}),
      });
    case "updateScreen": {
      if (wire.title === undefined && wire.icon === undefined) {
        throw new Error(`${tag}: needs 'title' or 'icon'`);
      }
      return parseOp(tag, {
        op: wire.op,
        id: need(wire.id, "id"),
        set: {
          ...(wire.title !== undefined ? { title: wire.title } : {}),
          ...(wire.icon !== undefined ? { icon: wire.icon } : {}),
        },
      });
    }
    case "removeScreen":
      return parseOp(tag, { op: wire.op, id: need(wire.id, "id") });
    case "addBlock":
      if (!wire.block) throw new Error(`${tag}: missing 'block'`);
      return parseOp(tag, {
        op: wire.op,
        screen: need(wire.screenId, "screenId"),
        block: wire.block,
        ...(wire.at !== undefined ? { at: wire.at } : {}),
      });
    case "updateBlock": {
      if (wire.setJson === undefined) {
        throw new Error(`${tag}: missing 'setJson'`);
      }
      let set: unknown;
      try {
        set = JSON.parse(wire.setJson) as unknown;
      } catch {
        throw new Error(`${tag}: 'setJson' is not valid JSON`);
      }
      if (typeof set !== "object" || set === null || Array.isArray(set)) {
        throw new Error(`${tag}: 'setJson' must be a JSON object`);
      }
      return parseOp(tag, { op: wire.op, id: need(wire.id, "id"), set });
    }
    case "removeBlock":
      return parseOp(tag, { op: wire.op, id: need(wire.id, "id") });
    case "moveBlock":
      if (wire.at === undefined) throw new Error(`${tag}: missing 'at'`);
      return parseOp(tag, {
        op: wire.op,
        id: need(wire.id, "id"),
        screen: need(wire.screenId, "screenId"),
        at: wire.at,
      });
    case "addCollection":
      if (!wire.collection) throw new Error(`${tag}: missing 'collection'`);
      return parseOp(tag, { op: wire.op, collection: wire.collection });
    case "addField":
      if (!wire.field) throw new Error(`${tag}: missing 'field'`);
      return parseOp(tag, {
        op: wire.op,
        collection: need(wire.collectionId, "collectionId"),
        field: wire.field,
      });
    case "renameApp": {
      if (wire.name === undefined && wire.tagline === undefined) {
        throw new Error(`${tag}: needs 'name' or 'tagline'`);
      }
      return parseOp(tag, {
        op: wire.op,
        ...(wire.name !== undefined ? { name: wire.name } : {}),
        ...(wire.tagline !== undefined ? { tagline: wire.tagline } : {}),
      });
    }
  }
}
