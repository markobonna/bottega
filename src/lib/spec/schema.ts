import { z } from "zod";
import { ACCENTS } from "../accents";

// AppSpec: the JSON contract for a generated app. Specs are data: every spec
// is checked here before it is saved or rendered.

const id = z
  .string()
  .regex(/^[a-z][a-z0-9_]{0,31}$/, "ids are lowercase, 1..32 chars");
const label = z.string().min(1).max(40);
const fieldId = id;

const FieldTypeSchema = z.enum([
  "text",
  "number",
  "date",
  "choice",
  "bool",
  "photo",
]);
export type FieldType = z.infer<typeof FieldTypeSchema>;

export const FieldSchema = z.object({
  id: fieldId,
  name: label,
  type: FieldTypeSchema,
  options: z.array(label).optional(),
});
export type Field = z.infer<typeof FieldSchema>;

export const CollectionSchema = z.object({
  id,
  name: label,
  fields: z.array(FieldSchema).max(12),
});
export type Collection = z.infer<typeof CollectionSchema>;

const blockBase = { id, title: label };

const ListBlock = z.object({
  ...blockBase,
  type: z.literal("list"),
  collection: id,
  show: z.array(fieldId).min(1).max(4),
  sort: z.object({ field: fieldId, dir: z.enum(["asc", "desc"]) }).optional(),
});

const FormBlock = z.object({
  ...blockBase,
  type: z.literal("form"),
  collection: id,
  fields: z.array(fieldId).min(1).max(12),
  submitLabel: label,
});

const StatBlock = z.object({
  ...blockBase,
  type: z.literal("stat"),
  collection: id,
  field: fieldId,
  agg: z.enum(["count", "sum", "latest", "avg"]),
  chart: z.enum(["none", "line"]),
});

const SeeBlock = z.object({
  ...blockBase,
  type: z.literal("see"),
  nouns: z.array(label).min(1).max(6),
  saveTo: z
    .object({
      collection: id,
      counts: z.record(z.string(), fieldId),
      photo: fieldId.optional(),
    })
    .optional(),
});

const HearBlock = z.object({
  ...blockBase,
  type: z.literal("hear"),
  collection: id,
  fields: z.array(fieldId).min(1).max(12),
  hint: z.string().min(1).max(120),
});

const PriceBlock = z.object({
  ...blockBase,
  type: z.literal("price"),
  collection: id,
  lines: z
    .array(
      z.object({
        field: fieldId,
        label,
        rate: z.number().min(0),
        unit: label,
      }),
    )
    .min(1)
    .max(12),
  currency: z
    .string()
    .regex(/^[A-Z]{3}$/, "currency is ISO 4217 (3 uppercase letters)")
    .default("USD"),
});

const CompareBlock = z.object({
  ...blockBase,
  type: z.literal("compare"),
  collection: id,
  before: fieldId,
  after: fieldId,
  caption: fieldId.optional(),
});

const TeachBlock = z.object({
  ...blockBase,
  type: z.literal("teach"),
  question: label,
  labels: z.tuple([label, label]),
  dims: z
    .array(z.object({ name: label, hint: z.string().min(1).max(120) }))
    .min(2)
    .max(6),
});

const DrawBlock = z.object({
  ...blockBase,
  type: z.literal("draw"),
  collection: id,
  titleField: fieldId,
  imageField: fieldId,
  promptTemplate: z.string().min(1).max(300),
});

const MakeBlock = z.object({
  ...blockBase,
  type: z.literal("make"),
  kind: z.literal("shelf"),
  defaults: z.object({
    width: z.number(),
    height: z.number(),
    depth: z.number(),
    shelves: z.number(),
    thickness: z.number(),
  }),
});

export const BlockSchema = z.discriminatedUnion("type", [
  ListBlock,
  FormBlock,
  StatBlock,
  SeeBlock,
  HearBlock,
  PriceBlock,
  CompareBlock,
  TeachBlock,
  DrawBlock,
  MakeBlock,
]);
export type Block = z.infer<typeof BlockSchema>;
export type BlockType = Block["type"];

export const ScreenSchema = z.object({
  id,
  title: label,
  icon: z.string().refine((s) => [...s].length === 1, "icon is one emoji"),
  blocks: z.array(BlockSchema).max(6),
});
export type Screen = z.infer<typeof ScreenSchema>;

export const AppSpecSchema = z
  .object({
    version: z.literal(1),
    name: label,
    tagline: z.string().min(1).max(80),
    look: z.object({ accent: z.enum(ACCENTS), icon: ScreenSchema.shape.icon }),
    collections: z.array(CollectionSchema).max(6),
    screens: z.array(ScreenSchema).max(6),
  })
  .superRefine((spec, ctx) => {
    const issue = (path: (string | number)[], message: string) =>
      ctx.addIssue({ code: "custom", path, message });
    const byId = new Map(spec.collections.map((c) => [c.id, c]));

    const needCollection = (ref: string, path: (string | number)[]) => {
      if (!byId.has(ref)) issue(path, `no collection '${ref}'`);
    };
    const needField = (
      collId: string,
      ref: string,
      want: FieldType | null,
      path: (string | number)[],
    ) => {
      const coll = byId.get(collId);
      if (!coll) return;
      const field = coll.fields.find((f) => f.id === ref);
      if (!field) {
        issue(path, `no field '${ref}' in collection '${collId}'`);
      } else if (want && field.type !== want) {
        issue(
          path,
          `field '${ref}' in collection '${collId}' is ${field.type}, need ${want}`,
        );
      }
    };

    const seenBlocks = new Set<string>();
    spec.screens.forEach((screen, si) => {
      screen.blocks.forEach((block, bi) => {
        const at = (...rest: (string | number)[]): (string | number)[] => [
          "screens",
          si,
          "blocks",
          bi,
          ...rest,
        ];
        if (seenBlocks.has(block.id)) {
          issue(at("id"), `duplicate block id '${block.id}'`);
        } else {
          seenBlocks.add(block.id);
        }
        switch (block.type) {
          case "list":
            needCollection(block.collection, at("collection"));
            block.show.forEach((f, i) =>
              needField(block.collection, f, null, at("show", i)),
            );
            if (block.sort) {
              needField(block.collection, block.sort.field, null, [
                ...at("sort"),
                "field",
              ]);
            }
            break;
          case "form":
          case "hear":
            needCollection(block.collection, at("collection"));
            block.fields.forEach((f, i) =>
              needField(block.collection, f, null, at("fields", i)),
            );
            break;
          case "stat":
            needCollection(block.collection, at("collection"));
            needField(
              block.collection,
              block.field,
              block.agg === "count" ? null : "number",
              at("field"),
            );
            break;
          case "see":
            if (block.saveTo) {
              needCollection(block.saveTo.collection, [
                ...at("saveTo"),
                "collection",
              ]);
              Object.entries(block.saveTo.counts).forEach(([noun, f]) =>
                needField(block.saveTo!.collection, f, "number", [
                  ...at("saveTo"),
                  "counts",
                  noun,
                ]),
              );
              if (block.saveTo.photo) {
                needField(block.saveTo.collection, block.saveTo.photo, "photo", [
                  ...at("saveTo"),
                  "photo",
                ]);
              }
            }
            break;
          case "price":
            needCollection(block.collection, at("collection"));
            block.lines.forEach((line, i) =>
              needField(block.collection, line.field, "number", [
                ...at("lines", i),
                "field",
              ]),
            );
            break;
          case "compare":
            needCollection(block.collection, at("collection"));
            needField(block.collection, block.before, "photo", at("before"));
            needField(block.collection, block.after, "photo", at("after"));
            if (block.caption) {
              needField(block.collection, block.caption, null, at("caption"));
            }
            break;
          case "draw":
            needCollection(block.collection, at("collection"));
            needField(
              block.collection,
              block.titleField,
              "text",
              at("titleField"),
            );
            needField(
              block.collection,
              block.imageField,
              "photo",
              at("imageField"),
            );
            break;
          case "teach":
          case "make":
            break;
        }
      });
    });

    spec.collections.forEach((coll, ci) => {
      coll.fields.forEach((field, fi) => {
        if (
          field.type === "choice" &&
          (!field.options ||
            field.options.length < 2 ||
            field.options.length > 12)
        ) {
          issue(
            ["collections", ci, "fields", fi, "options"],
            "choice fields need 2..12 options",
          );
        }
      });
    });
  });

export type AppSpec = z.infer<typeof AppSpecSchema>;

type PathSegment = string | number | symbol;

export function formatSpecPath(path: readonly PathSegment[]): string {
  if (path.length === 0) return "spec";
  let out = "";
  for (const seg of path) {
    if (typeof seg === "number") out += `[${seg}]`;
    else if (typeof seg === "string") out += out ? `.${seg}` : seg;
    else out += `[${String(seg)}]`;
  }
  return out;
}

export function parseSpec(
  json: unknown,
): { ok: true; spec: AppSpec } | { ok: false; issues: string[] } {
  const result = AppSpecSchema.safeParse(json);
  if (result.success) return { ok: true, spec: result.data };
  return {
    ok: false,
    issues: result.error.issues.map(
      (i) => `${formatSpecPath(i.path)}: ${i.message}`,
    ),
  };
}
