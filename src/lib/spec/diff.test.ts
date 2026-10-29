import { describe, expect, test } from "vitest";

import cole from "./fixtures/cole.json";
import maria from "./fixtures/maria.json";
import { applyOps } from "./ops";
import { parseSpec, type AppSpec } from "./schema";
import { diffSpecs } from "./diff";

function specOf(fixture: unknown): AppSpec {
  const parsed = parseSpec(fixture);
  if (!parsed.ok) throw new Error(parsed.issues.join("; "));
  return parsed.spec;
}

function edited(base: AppSpec, ops: unknown): AppSpec {
  const applied = applyOps(base, ops);
  if (!applied.ok) throw new Error(applied.issues.join("; "));
  return applied.spec;
}

describe("diffSpecs", () => {
  test("identical specs have an empty diff", () => {
    expect(diffSpecs(specOf(maria), specOf(maria))).toEqual({
      added: [],
      changed: [],
      removed: [],
    });
  });

  test("added screen and block", () => {
    const next = edited(specOf(cole), [
      {
        op: "addScreen",
        screen: {
          id: "gallery",
          title: "Gallery",
          icon: "🎨",
          blocks: [
            {
              id: "gallery_draw",
              type: "draw",
              title: "Pretty pictures",
              collection: "pieces",
              titleField: "name",
              imageField: "after",
              promptTemplate: "a restored chair",
            },
          ],
        },
      },
    ]);
    const diff = diffSpecs(specOf(cole), next);
    expect(diff.added).toContain("Screen: Gallery");
    expect(diff.added).toContain("Block: Draw · Pretty pictures");
    expect(diff.changed).toEqual([]);
    expect(diff.removed).toEqual([]);
  });

  test("price rate change", () => {
    const base = specOf(cole);
    const price = base.screens
      .flatMap((s) => s.blocks)
      .find((b) => b.id === "quote_price");
    if (price?.type !== "price") throw new Error("no price block");
    const lines = price.lines.map((l) =>
      l.field === "missing_veneer" ? { ...l, rate: 110 } : l,
    );
    const next = edited(base, [
      { op: "updateBlock", id: "quote_price", set: { lines } },
    ]);
    expect(diffSpecs(base, next).changed).toContain(
      "Price · Veneer patch rate 90 → 110",
    );
  });

  test("screen title change and block removal", () => {
    const base = specOf(cole);
    const next = edited(base, [
      { op: "updateScreen", id: "pieces", set: { title: "Projects" } },
      { op: "removeBlock", id: "pieces_list" },
    ]);
    const diff = diffSpecs(base, next);
    expect(diff.changed).toContain("Screen title: Pieces → Projects");
    expect(diff.removed).toContain("Block: List · On the bench");
  });

  test("added collection, field and app rename", () => {
    const base = specOf(maria);
    const next = edited(base, [
      {
        op: "addCollection",
        collection: {
          id: "suppliers",
          name: "Suppliers",
          fields: [{ id: "name", name: "Name", type: "text" }],
        },
      },
      {
        op: "addField",
        collection: "orders",
        field: { id: "allergy_notes", name: "allergy notes", type: "text" },
      },
      { op: "renameApp", name: "Maria's Boulangerie" },
    ]);
    const diff = diffSpecs(base, next);
    expect(diff.added).toContain("Collection: Suppliers");
    expect(diff.added).toContain("Field: Orders → allergy notes");
    expect(diff.changed).toContain(
      "App name: Maria's Bakery → Maria's Boulangerie",
    );
  });

  test("moved block", () => {
    const base = specOf(maria);
    const next = edited(base, [
      { op: "moveBlock", id: "orders_list", screen: "pantry", at: 0 },
    ]);
    expect(diffSpecs(base, next).changed).toContain(
      "Block moved: Open orders → Pantry",
    );
  });
});
