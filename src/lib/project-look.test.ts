import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  portraitPrompt,
  revisePortraitPrompt,
  reviseSketchPrompt,
  sketchPrompt,
  specScreenLine,
} from "./project-look";

describe("project look prompts", () => {
  it("sketch is black and white bare-bones, carries the subject", () => {
    for (const kind of ["hardware", "software", "print", "recipe"]) {
      const p = sketchPrompt(kind, "Truck Price Sign");
      expect(p).toContain("black and white");
      expect(p).toContain("bare-bones");
      expect(p).toContain("Truck Price Sign");
      expect(p).toContain("no text");
    }
  });

  it("hardware sketches as pencil, software as wireframe", () => {
    expect(sketchPrompt("hardware", "x")).toContain("pencil");
    expect(sketchPrompt("software", "x")).toContain("wireframe");
  });

  it("software sketch draws one frame per real screen", () => {
    const p = sketchPrompt("software", "x", 3);
    expect(p).toContain("exactly 3 phone screens");
    expect(p).toContain("one phone frame per screen");
    expect(p).toContain("compact grid");
    expect(p).toContain("each screen fully visible");
    expect(p).toContain("everything fully inside the frame");
    expect(p).toContain("no icon grid");
    expect(p).not.toContain("2 by 2");
    const one = sketchPrompt("software", "x", 1);
    expect(one).toContain("exactly one phone screen");
  });

  it("specScreenLine names the app's real screens and blocks", () => {
    const line = specScreenLine({
      screens: [
        { title: "Truck Call", blocks: [{ type: "hear", title: "Call in order" }] },
        { title: "Sales", blocks: [{ type: "stat", title: "Totals" }] },
      ],
    });
    expect(line).toContain("Truck Call (hear: Call in order)");
    expect(line).toContain("Sales (stat: Totals)");
    expect(line.length).toBeLessThanOrEqual(500);
  });

  it("software portrait keeps the same screens", () => {
    const p = portraitPrompt("software");
    expect(p).toContain("same phone screens");
    expect(p).toContain("same layout in each screen");
    expect(p).toContain("each screen fully visible");
  });

  it("portrait grows out of the sketch, same subject", () => {
    expect(portraitPrompt("hardware")).toContain("same object");
    expect(portraitPrompt("software")).toContain("same phone screens");
    expect(portraitPrompt("hardware")).toContain("full-color");
  });

  it("portrait forbids invented scenery, plain white background", () => {
    for (const kind of ["hardware", "software"]) {
      const p = portraitPrompt(kind);
      expect(p).toContain("plain white background");
      expect(p).toContain("no scenery");
    }
  });

  it("revise keeps the instruction and the house invariants", () => {
    const s = reviseSketchPrompt("hardware", "wall-mount it");
    expect(s).toContain("wall-mount it");
    expect(s).toContain("black and white");
    expect(s).toContain("white background");
    const w = reviseSketchPrompt("software", "bigger buttons");
    expect(w).toContain("bigger buttons");
    expect(w).toContain("same phone app screens");
    expect(w).toContain("one phone frame per screen");
    expect(w).toContain("each screen fully visible");
    const rp = revisePortraitPrompt("software", "dark mode");
    expect(rp).toContain("dark mode");
    expect(rp).toContain("same phone screens");
    const rh = revisePortraitPrompt("hardware", "brass finish");
    expect(rh).toContain("brass finish");
    expect(rh).toContain("same object and composition");
    expect(rh).toContain("plain white background");
    expect(rh).toContain("no scenery");
  });
});
