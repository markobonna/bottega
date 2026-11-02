import { z } from "zod";
import { ACCENTS } from "../accents";
import {
  BlockSchema,
  CollectionSchema,
  FieldSchema,
  ScreenSchema,
  formatSpecPath,
  parseSpec,
  type AppSpec,
} from "./schema";

// Spec edits are ops, not rebuilds. Every op carries an "op" discriminator
// (removeScreen and removeBlock would otherwise share the same { id } shape,
// and errors must name the op).

const atIndex = z.number().int().min(0).optional();

export const OpSchema = z.discriminatedUnion("op", [
  z.object({ op: z.literal("addScreen"), screen: ScreenSchema, at: atIndex }),
  z.object({
    op: z.literal("updateScreen"),
    id: z.string(),
    set: z.object({ title: z.string().optional(), icon: z.string().optional() }),
  }),
  z.object({ op: z.literal("removeScreen"), id: z.string() }),
  z.object({
    op: z.literal("moveScreen"),
    id: z.string(),
    at: z.number().int().min(0),
  }),
  z.object({
    op: z.literal("addBlock"),
    screen: z.string(),
    block: BlockSchema,
    at: atIndex,
  }),
  z.object({
    op: z.literal("updateBlock"),
    id: z.string(),
    set: z.record(z.string(), z.unknown()),
  }),
  z.object({ op: z.literal("removeBlock"), id: z.string() }),
  z.object({
    op: z.literal("moveBlock"),
    id: z.string(),
    screen: z.string(),
    at: z.number().int().min(0),
  }),
  z.object({ op: z.literal("addCollection"), collection: CollectionSchema }),
  z.object({
    op: z.literal("updateCollection"),
    id: z.string(),
    set: z.object({ name: z.string() }),
  }),
  z.object({
    op: z.literal("addField"),
    collection: z.string(),
    field: FieldSchema,
  }),
  z.object({
    op: z.literal("updateField"),
    collection: z.string(),
    id: z.string(),
    set: z.object({
      name: z.string().optional(),
      options: z.array(z.string()).optional(),
    }),
  }),
  z.object({
    op: z.literal("duplicateBlock"),
    id: z.string(),
    newId: z.string(),
    screen: z.string().optional(),
    at: atIndex,
  }),
  z.object({
    op: z.literal("renameApp"),
    name: z.string().optional(),
    tagline: z.string().optional(),
  }),
  z.object({
    op: z.literal("updateLook"),
    accent: z.enum(ACCENTS).optional(),
    icon: z.string().optional(),
  }),
]);
export type Op = z.infer<typeof OpSchema>;

export type ApplyResult =
  | { ok: true; spec: AppSpec }
  | { ok: false; issues: string[] };

function opName(raw: unknown): string {
  if (
    typeof raw === "object" &&
    raw !== null &&
    typeof (raw as { op?: unknown }).op === "string"
  ) {
    return (raw as { op: string }).op;
  }
  return "unknown";
}

function findBlock(spec: AppSpec, id: string): { si: number; bi: number } | null {
  for (const [si, screen] of spec.screens.entries()) {
    const bi = screen.blocks.findIndex((b) => b.id === id);
    if (bi >= 0) return { si, bi };
  }
  return null;
}

function applyOne(spec: AppSpec, op: Op): string | null {
  switch (op.op) {
    case "addScreen": {
      const at = op.at ?? spec.screens.length;
      if (at > spec.screens.length) return `screen index ${at} out of range`;
      spec.screens.splice(at, 0, op.screen);
      return null;
    }
    case "updateScreen": {
      const screen = spec.screens.find((s) => s.id === op.id);
      if (!screen) return `no screen '${op.id}'`;
      if (op.set.title !== undefined) screen.title = op.set.title;
      if (op.set.icon !== undefined) screen.icon = op.set.icon;
      return null;
    }
    case "removeScreen": {
      const si = spec.screens.findIndex((s) => s.id === op.id);
      if (si < 0) return `no screen '${op.id}'`;
      spec.screens.splice(si, 1);
      return null;
    }
    case "moveScreen": {
      const si = spec.screens.findIndex((s) => s.id === op.id);
      if (si < 0) return `no screen '${op.id}'`;
      const [screen] = spec.screens.splice(si, 1);
      if (op.at > spec.screens.length) {
        spec.screens.splice(si, 0, screen);
        return `screen index ${op.at} out of range`;
      }
      spec.screens.splice(op.at, 0, screen);
      return null;
    }
    case "addBlock": {
      const screen = spec.screens.find((s) => s.id === op.screen);
      if (!screen) return `no screen '${op.screen}'`;
      const at = op.at ?? screen.blocks.length;
      if (at > screen.blocks.length) return `block index ${at} out of range`;
      screen.blocks.splice(at, 0, op.block);
      return null;
    }
    case "updateBlock": {
      const found = findBlock(spec, op.id);
      if (!found) return `no block '${op.id}'`;
      const block = spec.screens[found.si].blocks[found.bi];
      if ("id" in op.set && op.set.id !== block.id) {
        return "may not change a block's id";
      }
      if ("type" in op.set && op.set.type !== block.type) {
        return "may not change a block's type";
      }
      Object.assign(block, op.set);
      return null;
    }
    case "removeBlock": {
      const found = findBlock(spec, op.id);
      if (!found) return `no block '${op.id}'`;
      spec.screens[found.si].blocks.splice(found.bi, 1);
      return null;
    }
    case "moveBlock": {
      const found = findBlock(spec, op.id);
      if (!found) return `no block '${op.id}'`;
      const target = spec.screens.find((s) => s.id === op.screen);
      if (!target) return `no screen '${op.screen}'`;
      const [block] = spec.screens[found.si].blocks.splice(found.bi, 1);
      if (op.at > target.blocks.length) {
        spec.screens[found.si].blocks.splice(found.bi, 0, block);
        return `block index ${op.at} out of range`;
      }
      target.blocks.splice(op.at, 0, block);
      return null;
    }
    case "addCollection": {
      spec.collections.push(op.collection);
      return null;
    }
    case "addField": {
      const coll = spec.collections.find((c) => c.id === op.collection);
      if (!coll) return `no collection '${op.collection}'`;
      if (coll.fields.some((f) => f.id === op.field.id)) {
        return `duplicate field id '${op.field.id}' in collection '${op.collection}'`;
      }
      coll.fields.push(op.field);
      return null;
    }
    case "updateCollection": {
      const coll = spec.collections.find((c) => c.id === op.id);
      if (!coll) return `no collection '${op.id}'`;
      coll.name = op.set.name;
      return null;
    }
    case "updateField": {
      const coll = spec.collections.find((c) => c.id === op.collection);
      if (!coll) return `no collection '${op.collection}'`;
      const field = coll.fields.find((f) => f.id === op.id);
      if (!field) return `no field '${op.id}' in collection '${op.collection}'`;
      if (op.set.name !== undefined) field.name = op.set.name;
      if (op.set.options !== undefined) {
        if (field.type !== "choice") {
          return `field '${op.id}' is ${field.type}, not choice — options need a choice field`;
        }
        field.options = op.set.options;
      }
      return null;
    }
    case "duplicateBlock": {
      const found = findBlock(spec, op.id);
      if (!found) return `no block '${op.id}'`;
      if (findBlock(spec, op.newId)) {
        return `duplicate block id '${op.newId}'`;
      }
      const target = op.screen
        ? spec.screens.find((s) => s.id === op.screen)
        : spec.screens[found.si];
      if (!target) return `no screen '${op.screen}'`;
      const at = op.at ?? target.blocks.length;
      if (at > target.blocks.length) {
        return `block index ${at} out of range`;
      }
      const copy = structuredClone(spec.screens[found.si].blocks[found.bi]);
      copy.id = op.newId;
      target.blocks.splice(at, 0, copy);
      return null;
    }
    case "renameApp": {
      if (op.name !== undefined) spec.name = op.name;
      if (op.tagline !== undefined) spec.tagline = op.tagline;
      return null;
    }
    case "updateLook": {
      if (op.accent !== undefined) spec.look.accent = op.accent;
      if (op.icon !== undefined) spec.look.icon = op.icon;
      return null;
    }
  }
}

export function applyOps(spec: AppSpec, ops: unknown): ApplyResult {
  if (!Array.isArray(ops)) return { ok: false, issues: ["ops: expected an array of ops"] };
  if (ops.length === 0) return { ok: false, issues: ["ops: nothing to change"] };

  const parsed = z.array(OpSchema).safeParse(ops);
  if (!parsed.success) {
    return {
      ok: false,
      issues: parsed.error.issues.map((i) => {
        const [idx, ...rest] = i.path;
        const head = `ops[${String(idx)}] (${opName((ops as unknown[])[idx as number])})`;
        return rest.length > 0
          ? `${head}: ${formatSpecPath(rest)}: ${i.message}`
          : `${head}: ${i.message}`;
      }),
    };
  }

  const next = structuredClone(spec);
  for (const [i, op] of parsed.data.entries()) {
    const problem = applyOne(next, op);
    if (problem) return { ok: false, issues: [`ops[${i}] (${op.op}): ${problem}`] };
  }

  return parseSpec(next);
}
