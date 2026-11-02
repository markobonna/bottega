import { describe, expect, test } from "vitest";
import cole from "./fixtures/cole.json";
import maria from "./fixtures/maria.json";
import { applyOps } from "./ops";
import { parseSpec, type AppSpec } from "./schema";

function coleSpec(): AppSpec {
  const parsed = parseSpec(structuredClone(cole));
  if (!parsed.ok) throw new Error("cole fixture must parse");
  return parsed.spec;
}

describe("spec ops", () => {
  test("adding a draw screen to cole works and parses", () => {
    const result = applyOps(coleSpec(), [
      {
        op: "addScreen",
        screen: {
          id: "gallery",
          title: "Gallery",
          icon: "🎨",
          blocks: [
            {
              id: "gallery_draw",
              title: "Finish portrait",
              type: "draw",
              collection: "pieces",
              titleField: "name",
              imageField: "after",
              promptTemplate: "a restored {name} in warm workshop light",
            },
          ],
        },
      },
    ]);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const gallery = result.spec.screens.find((s) => s.id === "gallery");
    expect(gallery?.blocks.map((b) => b.type)).toEqual(["draw"]);
  });

  test("updateBlock on cole's price block can change one rate", () => {
    const before = coleSpec();
    const price = before.screens
      .flatMap((s) => s.blocks)
      .find((b) => b.id === "quote_price");
    expect(price?.type).toBe("price");
    if (!price || price.type !== "price") return;
    const lines = price.lines.map((l) =>
      l.field === "scratches" ? { ...l, rate: 30 } : l,
    );
    const result = applyOps(coleSpec(), [
      { op: "updateBlock", id: "quote_price", set: { lines } },
    ]);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const after = result.spec.screens
      .flatMap((s) => s.blocks)
      .find((b) => b.id === "quote_price");
    expect(after?.type).toBe("price");
    if (!after || after.type !== "price") return;
    expect(after.lines.find((l) => l.field === "scratches")?.rate).toBe(30);
    expect(after.lines.find((l) => l.field === "chips")?.rate).toBe(40);
  });

  test("removeBlock then addBlock with the same id works", () => {
    const result = applyOps(coleSpec(), [
      { op: "removeBlock", id: "pieces_list" },
      {
        op: "addBlock",
        screen: "pieces",
        block: {
          id: "pieces_list",
          title: "On the bench",
          type: "list",
          collection: "pieces",
          show: ["name", "status"],
        },
      },
    ]);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const list = result.spec.screens
      .flatMap((s) => s.blocks)
      .find((b) => b.id === "pieces_list");
    expect(list?.type).toBe("list");
    if (!list || list.type !== "list") return;
    expect(list.show).toEqual(["name", "status"]);
  });

  test("updateBlock changing type fails", () => {
    const result = applyOps(coleSpec(), [
      { op: "updateBlock", id: "quote_price", set: { type: "stat" } },
    ]);
    expect(result).toEqual({
      ok: false,
      issues: ["ops[0] (updateBlock): may not change a block's type"],
    });
  });

  test("addField with a duplicate id fails", () => {
    const result = applyOps(coleSpec(), [
      {
        op: "addField",
        collection: "pieces",
        field: { id: "name", name: "Name again", type: "text" },
      },
    ]);
    expect(result).toEqual({
      ok: false,
      issues: [
        "ops[0] (addField): duplicate field id 'name' in collection 'pieces'",
      ],
    });
  });

  test("addBlock to a missing screen fails", () => {
    const result = applyOps(coleSpec(), [
      {
        op: "addBlock",
        screen: "nope",
        block: {
          id: "x",
          title: "X",
          type: "list",
          collection: "pieces",
          show: ["name"],
        },
      },
    ]);
    expect(result).toEqual({
      ok: false,
      issues: ["ops[0] (addBlock): no screen 'nope'"],
    });
  });

  test("an op stranding a see block fails with a spec path", () => {
    const result = applyOps(coleSpec(), [
      {
        op: "updateBlock",
        id: "damage_see",
        set: { saveTo: { collection: "pieces", counts: { scratch: "nope" } } },
      },
    ]);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.issues).toEqual([
      "screens[1].blocks[0].saveTo.counts.scratch: no field 'nope' in collection 'pieces'",
    ]);
  });

  test("an empty ops list is an error", () => {
    expect(applyOps(coleSpec(), [])).toEqual({
      ok: false,
      issues: ["ops: nothing to change"],
    });
  });

  test("updateLook changes the accent and icon", () => {
    const spec = coleSpec();
    const result = applyOps(spec, [
      { op: "updateLook", accent: "plum", icon: "🪑" },
    ]);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.spec.look.accent).toBe("plum");
    expect(result.spec.look.icon).toBe("🪑");
  });

  test("updateLook rejects a bad accent", () => {
    const result = applyOps(coleSpec(), [
      { op: "updateLook", accent: "hotpink" },
    ]);
    expect(result.ok).toBe(false);
  });

  test("moveScreen reorders tabs", () => {
    const result = applyOps(coleSpec(), [
      { op: "moveScreen", id: "quote", at: 0 },
    ]);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.spec.screens.map((s) => s.id)).toEqual([
      "quote",
      "pieces",
      "damage",
      "before_after",
    ]);
  });

  test("moveScreen rejects a missing screen and a wild index", () => {
    expect(
      applyOps(coleSpec(), [{ op: "moveScreen", id: "nope", at: 0 }]).ok,
    ).toBe(false);
    const wild = applyOps(coleSpec(), [{ op: "moveScreen", id: "quote", at: 9 }]);
    expect(wild.ok).toBe(false);
    if (!wild.ok) {
      expect(wild.issues[0]).toContain("out of range");
    }
  });

  test("updateCollection renames a collection", () => {
    const result = applyOps(coleSpec(), [
      { op: "updateCollection", id: "pieces", set: { name: "Restorations" } },
    ]);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.spec.collections[0].name).toBe("Restorations");
  });

  test("updateField renames a field and edits choice options", () => {
    const result = applyOps(coleSpec(), [
      {
        op: "updateField",
        collection: "pieces",
        id: "status",
        set: { name: "Stage", options: ["assessing", "quoted", "done"] },
      },
    ]);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const status = result.spec.collections[0].fields.find(
      (f) => f.id === "status",
    );
    expect(status?.name).toBe("Stage");
    expect(status?.options).toEqual(["assessing", "quoted", "done"]);
  });

  test("updateField refuses options on a non-choice field", () => {
    const result = applyOps(coleSpec(), [
      {
        op: "updateField",
        collection: "pieces",
        id: "notes",
        set: { options: ["a", "b"] },
      },
    ]);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.issues[0]).toContain("not choice");
    }
  });

  test("duplicateBlock copies a block under a new id", () => {
    const result = applyOps(coleSpec(), [
      { op: "duplicateBlock", id: "pieces_list", newId: "pieces_list_2" },
    ]);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const ids = result.spec.screens[0].blocks.map((b) => b.id);
    expect(ids).toContain("pieces_list");
    expect(ids).toContain("pieces_list_2");
  });

  test("duplicateBlock rejects a taken id", () => {
    const result = applyOps(coleSpec(), [
      { op: "duplicateBlock", id: "pieces_list", newId: "pieces_form" },
    ]);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.issues[0]).toContain("duplicate block id");
    }
  });

  test("the input spec is unchanged after any call", () => {
    const snapshot = JSON.stringify(maria);
    const parsed = parseSpec(structuredClone(maria));
    if (!parsed.ok) throw new Error("maria fixture must parse");
    const spec = parsed.spec;
    const before = JSON.stringify(spec);
    applyOps(spec, [{ op: "renameApp", name: "Changed" }]);
    applyOps(spec, [{ op: "removeBlock", id: "missing" }]);
    applyOps(spec, [
      { op: "addField", collection: "orders", field: { id: "x", name: "X", type: "text" } },
    ]);
    expect(JSON.stringify(spec)).toBe(before);
    expect(JSON.stringify(maria)).toBe(snapshot);
  });
});
