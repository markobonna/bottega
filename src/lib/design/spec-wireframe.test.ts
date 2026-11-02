import { describe, expect, it } from "vitest";
import { renderSpecWireframe } from "./spec-wireframe";

const screens = [
  {
    title: "Truck Call",
    blocks: [{ type: "hear", title: "Call in order" }],
  },
  {
    title: "Sales",
    blocks: [
      { type: "stat", title: "Totals" },
      { type: "mystery", title: "Weird" },
    ],
  },
];

describe("renderSpecWireframe", () => {
  it("draws one phone frame per screen with labeled block boxes", () => {
    const h = renderSpecWireframe(screens);
    expect(h).toContain("Truck Call");
    expect(h).toContain("Call in order");
    expect(h).toContain("🎙️");
    expect(h).toContain("Totals");
    expect(h).toContain("📈");
    expect(h.match(/sw-phone/g)!.length).toBe(2);
    expect(h.match(/class="sw-block"/g)!.length).toBe(3);
  });
  it("falls back on unknown block types", () => {
    expect(renderSpecWireframe(screens)).toContain("▫️");
  });
  it("escapes hostile titles", () => {
    const h = renderSpecWireframe([
      { title: "<script>", blocks: [{ type: "list", title: "<b>" }] },
    ]);
    expect(h).not.toContain("<script>");
    expect(h).toContain("&lt;script&gt;");
    expect(h).toContain("aria-label=\"Wireframe: &lt;script&gt; (1)\"");
  });
  it("handles no screens", () => {
    expect(renderSpecWireframe([])).toContain("No screens yet.");
  });
  it("draws browser frames for desktop", () => {
    const h = renderSpecWireframe(screens, "desktop");
    expect(h).toContain('class="sw-grid desk"');
    expect(h.match(/class="sw-phone desk"/g)!.length).toBe(2);
    expect(h).toContain("Truck Call");
  });
  it("defaults to phone frames", () => {
    expect(renderSpecWireframe(screens)).toContain('class="sw-grid"');
  });
});
