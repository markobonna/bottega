import { describe, expect, it } from "vitest";
import NS from "./standalone-boot.js";
import coleSpec from "../spec/fixtures/cole.json";

const coll = {
  id: "pieces",
  name: "Pieces",
  fields: [
    { id: "name", name: "Name", type: "text" },
    { id: "before", name: "Before", type: "photo" },
    { id: "scratches", name: "Scratches", type: "number" },
    { id: "due", name: "Due", type: "date" },
    { id: "status", name: "Status", type: "choice", options: ["new", "done"] },
    { id: "rush", name: "Rush", type: "bool" },
  ],
};

const recs = [
  {
    id: "b",
    data: {
      name: "Oak chair",
      before: "",
      scratches: 3,
      due: "2026-11-02",
      status: "new",
      rush: true,
    },
  },
  {
    id: "a",
    data: {
      name: '<script>alert("x")</script>',
      before: "",
      scratches: 1,
      due: "",
      status: "done",
      rush: false,
    },
  },
];

describe("standalone pure helpers", () => {
  it("escapes html", () => {
    expect(NS.esc('<a href="x">&\'')).toBe(
      "&lt;a href=&quot;x&quot;&gt;&amp;&#39;",
    );
  });
  it("finds collections, fields, records", () => {
    expect(NS.collById(coleSpec, "pieces").name).toBe("Pieces");
    expect(NS.collById(coleSpec, "nope")).toBe(null);
    expect(NS.fieldById(coll, "due").type).toBe("date");
    expect(NS.recordsFor({ pieces: recs }, "pieces")).toHaveLength(2);
    expect(NS.recordsFor({}, "pieces")).toEqual([]);
  });
  it("formats dates, passes garbage through", () => {
    expect(NS.fmtDate("2026-11-02")).toBe("Nov 2");
    expect(NS.fmtDate("")).toBe("");
    expect(NS.fmtDate("not-a-date")).toBe("not-a-date");
  });
  it("labels records from the first text field", () => {
    expect(NS.recordLabel(coll, recs[0])).toBe("Oak chair");
    expect(NS.recordLabel(null, recs[0])).toBe("Record");
  });
  it("sorts by field or newest-first by id", () => {
    const asc = NS.sortRecords(recs, { field: "scratches", dir: "asc" });
    expect(asc[0].id).toBe("a");
    const desc = NS.sortRecords(recs, { field: "scratches", dir: "desc" });
    expect(desc[0].id).toBe("b");
    expect(NS.sortRecords(recs, null)[0].id).toBe("b");
  });
  it("makes unique ids", () => {
    expect(NS.uid()).not.toBe(NS.uid());
  });
});

describe("standalone cells", () => {
  it("renders each field type and escapes text", () => {
    expect(
      NS.cellHtml({ type: "photo" }, "data:image/png;base64,xx"),
    ).toContain("<img");
    expect(NS.cellHtml({ type: "photo" }, "")).toContain("sa-ph");
    expect(NS.cellHtml({ type: "choice" }, "new")).toContain("sa-chip");
    expect(NS.cellHtml({ type: "date" }, "2026-11-02")).toContain("Nov 2");
    expect(NS.cellHtml({ type: "bool" }, true)).toContain("Yes");
    expect(NS.cellHtml({ type: "number" }, 3)).toContain("3");
    expect(NS.cellHtml({ type: "text" }, "")).toContain("—");
    expect(NS.cellHtml({ type: "text" }, "<b>")).not.toContain("<b>");
  });
});

describe("standalone quote + money", () => {
  const lines = [
    { field: "scratches", label: "Scratch repair", rate: 25, unit: "each" },
    { field: "chips", label: "Chip fill", rate: 40, unit: "each" },
    { field: "missing_veneer", label: "Veneer patch", rate: 90, unit: "each" },
  ];
  it("totals in cents and skips zero qty", () => {
    const q = NS.quote(
      { data: { scratches: 3, chips: 1, missing_veneer: 2 } },
      lines,
    );
    expect(q.total).toBe(29500);
    expect(q.items).toHaveLength(3);
    const q2 = NS.quote({ data: { scratches: 0 } }, lines);
    expect(q2.items).toHaveLength(0);
    expect(q2.total).toBe(0);
  });
  it("does not drift on decimal rates", () => {
    const q = NS.quote(
      { data: { a: 1, b: 1 } },
      [
        { field: "a", label: "A", rate: 0.1, unit: "x" },
        { field: "b", label: "B", rate: 0.2, unit: "x" },
      ],
    );
    expect(q.total).toBe(30);
  });
  it("formats money and falls back on bad currency", () => {
    expect(NS.money(29500, "USD")).toBe("$295.00");
    expect(NS.money(29500, "USDD")).toBe("$295.00");
  });
});

describe("standalone stat", () => {
  it("aggregates and never NaNs", () => {
    expect(NS.statValue(recs, "scratches", "count")).toBe(2);
    expect(NS.statValue(recs, "scratches", "sum")).toBe(4);
    expect(NS.statValue(recs, "scratches", "avg")).toBe(2);
    expect(NS.statValue(recs, "scratches", "latest")).toBe(1);
    expect(NS.statValue([], "scratches", "sum")).toBe(null);
    expect(NS.statValue(recs, "name", "sum")).toBe(null);
  });
  it("draws a sparkline path", () => {
    const p = NS.sparkPath([1, 2, 3], 320, 90);
    expect(p.split(" ")).toHaveLength(3);
    expect(NS.sparkPath([], 320, 90)).toBe("");
  });
});

describe("standalone draw prompt", () => {
  it("fills {fields}, caps length, appends the house suffix", () => {
    const p = NS.drawPrompt("a photo of {name}", { data: { name: "pie" } });
    expect(p).toContain("a photo of pie");
    expect(p).toContain("no text, no logos");
    const long = NS.drawPrompt("{name}", { data: { name: "x".repeat(500) } });
    expect(long.length).toBeLessThan(500);
    expect(NS.drawPrompt("{missing}", { data: {} })).not.toContain("{");
  });
});

describe("standalone block renderers", () => {
  const listBlock = {
    id: "list1",
    title: "Pieces",
    type: "list",
    collection: "pieces",
    show: ["name", "scratches"],
  };
  it("list shows rows and escapes hostile values", () => {
    const h = NS.renderList(listBlock, coll, recs, {});
    expect(h).toContain("Oak chair");
    expect(h).toContain("&lt;script&gt;");
    expect(h).not.toContain('<script>alert("x")</script>');
    expect(NS.renderList(listBlock, coll, [], {})).toContain(
      "Nothing here yet.",
    );
    const open = NS.renderList(listBlock, coll, recs, { expanded: "b" });
    expect(open).toContain("Delete");
  });
  it("form renders all six input kinds with prefill", () => {
    const h = NS.renderForm(
      {
        id: "f1",
        title: "Add",
        type: "form",
        collection: "pieces",
        fields: ["name", "before", "scratches", "due", "status", "rush"],
        submitLabel: "Save it",
      },
      coll,
      { values: { name: "prefill" } },
    );
    expect(h).toContain('type="text"');
    expect(h).toContain('type="number"');
    expect(h).toContain('type="date"');
    expect(h).toContain("<select");
    expect(h).toContain('type="checkbox"');
    expect(h).toContain('type="file"');
    expect(h).toContain("prefill");
    expect(h).toContain("Save it");
  });
  it("hear gates voice behind the key box", () => {
    const block = {
      id: "h1",
      title: "Take an order",
      type: "hear",
      collection: "pieces",
      fields: ["name"],
      hint: "Say it",
    };
    const noKey = NS.renderHear(block, coll, {});
    expect(noKey).toContain("Meta API key");
    expect(noKey).not.toContain("Hold to talk");
    expect(noKey).toContain("type it in");
    const keyed = NS.renderHear(block, coll, { hasKey: true });
    expect(keyed).toContain("Hold to talk");
    const said = NS.renderHear(block, coll, {
      hasKey: true,
      transcript: "<loud>",
    });
    expect(said).toContain("&lt;loud&gt;");
  });
  it("see always offers manual counts and save", () => {
    const h = NS.renderSee(
      {
        id: "s1",
        title: "Count",
        type: "see",
        nouns: ["jar"],
        saveTo: { collection: "pieces", counts: { jar: "scratches" } },
      },
      {},
    );
    expect(h).toContain("jar");
    expect(h).toContain("Save counts");
    expect(h).toContain("Counting by eye");
  });
  it("draw gates pictures behind the key box", () => {
    const block = {
      id: "d1",
      title: "Board",
      type: "draw",
      collection: "pieces",
      titleField: "name",
      imageField: "before",
      promptTemplate: "a photo of {name}",
    };
    expect(NS.renderDraw(block, coll, recs, {})).toContain("Meta API key");
    expect(NS.renderDraw(block, coll, recs, { hasKey: true })).toContain(
      "Draw it",
    );
  });
  it("teach and make state their workshop-only line", () => {
    const t = NS.renderTeach({
      title: "Loaves",
      question: "Sell?",
      labels: ["No", "Yes"],
      dims: [{ name: "Crust", hint: "" }],
    });
    expect(t).toContain("trains in your Bottega workshop");
    const m = NS.renderMake({
      title: "Shelf",
      defaults: { width: 800, height: 1800, depth: 300, shelves: 4, thickness: 18 },
    });
    expect(m).toContain("800 mm");
    expect(m).toContain("lives in your Bottega workshop");
  });
  it("price renders the table, total, and copy", () => {
    const h = NS.renderPrice(
      {
        id: "p1",
        title: "Quote",
        type: "price",
        collection: "pieces",
        currency: "USD",
        lines: [
          { field: "scratches", label: "Scratch repair", rate: 25, unit: "each" },
        ],
      },
      coll,
      recs,
      {},
    );
    expect(h).toContain("$75.00");
    expect(h).toContain("Copy quote");
  });
  it("dispatch covers every block type on the real cole spec", () => {
    const ctx = { spec: coleSpec, records: { pieces: [] }, ui: {} };
    for (const screen of coleSpec.screens) {
      for (const block of screen.blocks) {
        const h = NS.renderBlock(block, ctx);
        expect(h).toContain(block.title);
      }
    }
    expect(NS.renderBlock({ id: "x", title: "Q", type: "zzz" }, ctx)).toContain(
      "isn&#39;t in this file",
    );
    expect(NS.renderNav(coleSpec, coleSpec.screens[0].id)).toContain(
      'aria-current="page"',
    );
  });
});

describe("standalone wav port", () => {
  it("encodes headers, length, and clamping", () => {
    const bytes = NS.encodeWav(new Float32Array([0, 1, -1, 2]), 16000);
    const text = (at: number, n: number) =>
      String.fromCharCode(...bytes.slice(at, at + n));
    expect(text(0, 4)).toBe("RIFF");
    expect(text(8, 4)).toBe("WAVE");
    expect(bytes.length).toBe(44 + 8);
    const view = new DataView(bytes.buffer);
    expect(view.getInt16(44 + 2, true)).toBe(32767);
    expect(view.getInt16(44 + 6, true)).toBe(32767);
  });
  it("downmixes channels by averaging", () => {
    const out = NS.downmix([
      new Float32Array([1, 3]),
      new Float32Array([3, 5]),
    ]);
    expect(Array.from(out)).toEqual([2, 4]);
  });
  it("sniffs webp vs png data urls", () => {
    const webp = Buffer.from("RIFF1234WEBPdata").toString("base64");
    expect(NS.sniffDataUrl(webp).startsWith("data:image/webp")).toBe(true);
    const png = Buffer.from("\x89PNGdata").toString("base64");
    expect(NS.sniffDataUrl(png).startsWith("data:image/png")).toBe(true);
  });
});
