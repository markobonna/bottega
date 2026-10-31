import { describe, expect, it } from "vitest";
import { brief, drawingKindFor, scad, slug, stl } from "./cad";

describe("cad files", () => {
  it("slugs names", () => {
    expect(slug("Espresso machine v2")).toBe("espresso-machine-v2");
  });
  it("picks the espresso/register branch by name", () => {
    expect(drawingKindFor("Espresso machine v2")).toBe("espresso");
    expect(drawingKindFor("Register drawer fix")).toBe("register");
    expect(drawingKindFor("Bike wall rack")).toBe("device");
  });
  it("scad carries the size and the espresso parts", () => {
    const out = scad("Espresso machine v2", {
      width: 440,
      depth: 420,
      height: 456,
    });
    expect(out).toContain("width  = 440;");
    expect(out).toContain("group_dia = 58;");
    expect(scad("Bike rack")).toContain("hollow shell");
  });
  it("stl is a closed solid naming the project", () => {
    const out = stl("Bike rack");
    expect(out.startsWith("solid bike-rack\n")).toBe(true);
    expect(out.trimEnd().endsWith("endsolid bike-rack")).toBe(true);
    expect(out.match(/facet normal/g)?.length).toBe(12);
  });
  it("brief lists notes and drafts", () => {
    const out = brief({
      name: "Rack",
      workshopName: "Garage",
      kindLabel: "Hardware",
      stageLabel: "Being built",
      tagline: "Wall rack",
      notes: [{ who: "you", part: 1, text: "Holds three bikes" }],
      drafts: [{ n: 1, label: "Sketch", stage: "sketch" }],
    });
    expect(out).toContain("# Rack");
    expect(out).toContain("Holds three bikes");
    expect(out).toContain("1. Sketch (sketch)");
  });
  it("brief groups tagged notes under their topics", () => {
    const out = brief({
      name: "Rack",
      workshopName: "Garage",
      kindLabel: "Hardware",
      stageLabel: "Being built",
      tagline: "Wall rack",
      topics: [
        ["measure", "Measure"],
        ["screens", "Screens"],
      ],
      notes: [
        { who: "you", part: null, topic: null, text: "For the side wall" },
        { who: "you", part: 1, topic: "measure", text: "90 cm clearance" },
        { who: "apprentice", part: 1, topic: "measure", text: "Noted" },
      ],
      drafts: [],
    });
    expect(out).toContain("### General");
    expect(out).toContain("### Measure");
    expect(out).not.toContain("### Screens");
    expect(out.indexOf("### General")).toBeLessThan(
      out.indexOf("### Measure"),
    );
  });
});
