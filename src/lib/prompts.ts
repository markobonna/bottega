import { z } from "zod";

import { ACCENTS } from "./accents";

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
