import { describe, expect, test } from "vitest";
import cole from "./fixtures/cole.json";
import maria from "./fixtures/maria.json";
import { parseSpec } from "./schema";

function base(): Record<string, unknown> {
  return {
    version: 1,
    name: "T",
    tagline: "T",
    look: { accent: "terracotta", icon: "🥖" },
    collections: [
      {
        id: "things",
        name: "Things",
        fields: [
          { id: "title", name: "Title", type: "text" },
          { id: "n", name: "N", type: "number" },
        ],
      },
    ],
    screens: [
      {
        id: "main",
        title: "Main",
        icon: "🥖",
        blocks: [
          {
            id: "b1",
            title: "B",
            type: "list",
            collection: "things",
            show: ["title"],
          },
        ],
      },
    ],
  };
}

type Block = { id: string; [k: string]: unknown };

function firstBlockOf(spec: Record<string, unknown>): Block {
  const screens = spec.screens as { blocks: Block[] }[];
  return screens[0].blocks[0];
}

describe("spec schema", () => {
  test("maria fixture parses", () => {
    expect(parseSpec(maria)).toMatchObject({ ok: true });
  });

  test("cole fixture parses", () => {
    expect(parseSpec(cole)).toMatchObject({ ok: true });
  });

  test("fixtures share no screen titles", () => {
    const titles = (s: typeof maria) => s.screens.map((x) => x.title);
    const shared = titles(maria).filter((t) =>
      titles(cole as typeof maria).includes(t),
    );
    expect(shared).toEqual([]);
  });

  test("fixtures have different block layouts", () => {
    const layout = (s: typeof maria) =>
      JSON.stringify(s.screens.map((x) => x.blocks.map((b) => b.type)));
    expect(layout(maria)).not.toBe(layout(cole as typeof maria));
  });

  test("unknown block type fails at the block path", () => {
    const spec = base();
    firstBlockOf(spec).type = "bogus";
    const result = parseSpec(spec);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.issues.length).toBeGreaterThan(0);
    expect(result.issues[0]).toMatch(/^screens\[0\]\.blocks\[0\]/);
  });

  test("missing collection fails with the right path", () => {
    const spec = base();
    firstBlockOf(spec).collection = "ordrs";
    expect(parseSpec(spec)).toEqual({
      ok: false,
      issues: ["screens[0].blocks[0].collection: no collection 'ordrs'"],
    });
  });

  test("see counts into a text field fails with the right path", () => {
    const spec = base();
    spec.screens = [
      {
        id: "main",
        title: "Main",
        icon: "🥖",
        blocks: [
          {
            id: "b1",
            title: "B",
            type: "see",
            nouns: ["widget"],
            saveTo: { collection: "things", counts: { widget: "title" } },
          },
        ],
      },
    ];
    expect(parseSpec(spec)).toEqual({
      ok: false,
      issues: [
        "screens[0].blocks[0].saveTo.counts.widget: field 'title' in collection 'things' is text, need number",
      ],
    });
  });

  test("7 screens fails at screens", () => {
    const spec = base();
    const one = (spec.screens as unknown[])[0];
    spec.screens = Array.from({ length: 7 }, (_, i) => ({
      ...(one as Record<string, unknown>),
      id: `s${i}`,
    }));
    const result = parseSpec(spec);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.issues[0]).toMatch(/^screens: .*6/);
  });

  test("duplicate block ids fail with the right path", () => {
    const spec = base();
    const screens = spec.screens as { blocks: Block[] }[];
    screens[0].blocks.push({ ...screens[0].blocks[0] });
    expect(parseSpec(spec)).toEqual({
      ok: false,
      issues: ["screens[0].blocks[1].id: duplicate block id 'b1'"],
    });
  });

  test("choice with 1 option fails with the right path", () => {
    const spec = base();
    const colls = spec.collections as {
      fields: { id: string; name: string; type: string; options?: string[] }[];
    }[];
    colls[0].fields.push({
      id: "c",
      name: "C",
      type: "choice",
      options: ["only"],
    });
    expect(parseSpec(spec)).toEqual({
      ok: false,
      issues: ["collections[0].fields[2].options: choice fields need 2..12 options"],
    });
  });

  test("uppercase id fails with the right path", () => {
    const spec = base();
    const colls = spec.collections as { id: string }[];
    colls[0].id = "Things";
    firstBlockOf(spec).collection = "Things";
    expect(parseSpec(spec)).toEqual({
      ok: false,
      issues: [
        "collections[0].id: ids are lowercase, 1..32 chars",
        "screens[0].blocks[0].collection: ids are lowercase, 1..32 chars",
      ],
    });
  });
});
