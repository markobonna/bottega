import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  artSubject,
  portraitPrompt,
  promptBase,
  revisePortraitPrompt,
  reviseSketchPrompt,
  sketchPrompt,
  specScreenLine,
} from "./project-look";

describe("project look prompts", () => {
  it("sketch is black and white bare-bones, carries the subject", () => {
    for (const kind of [
      "hardware",
      "software",
      "print",
      "recipe",
      "music",
      "dance",
    ]) {
      const p = sketchPrompt(kind, "Truck Price Sign");
      expect(p).toContain("black and white");
      expect(p).toContain("bare-bones");
      expect(p).toContain("Truck Price Sign");
      expect(p).toContain("no text");
    }
  });

  it("sketch base is the thing's name, never the block list", () => {
    const base = promptBase({
      name: "Cafe Logo Sign",
      tagline: "Design, price and hang your glowing cafe logo.",
    });
    expect(base).toContain("Cafe Logo Sign");
    // No block words for the image model to illustrate as objects.
    for (const word of ["stat", "price:", "see:", "hear:", "list:"]) {
      expect(base).not.toContain(word);
    }
  });

  it("art subject is the user's words, tagline only as fallback", () => {
    const spec = { name: "Cafe Logo Sign", tagline: "Design, price and hang it." };
    expect(
      artSubject(spec, "An electric logo sign outside a cafe"),
    ).toBe("An electric logo sign outside a cafe");
    expect(artSubject(spec, null)).toBe(promptBase(spec));
    expect(artSubject(spec, "   ")).toBe(promptBase(spec));
  });

  it("non-software sketch is one object, never a worksheet collage", () => {
    for (const kind of ["hardware", "print", "recipe", "music", "dance"]) {
      const p = sketchPrompt(kind, "Cafe Logo Sign");
      expect(p).toContain("a single object in one view");
      expect(p).toContain("no collage");
      expect(p).toContain("no charts");
    }
  });

  it("hardware sketches as pencil, software as wireframe", () => {
    expect(sketchPrompt("hardware", "x")).toContain("pencil");
    expect(sketchPrompt("software", "x")).toContain("wireframe");
  });

  it("every other kind sketches its own thing, never phone UI", () => {
    expect(sketchPrompt("print", "x")).toContain("printed piece");
    expect(sketchPrompt("recipe", "x")).toContain("plated dish");
    expect(sketchPrompt("music", "x")).toContain("instruments");
    expect(sketchPrompt("dance", "x")).toContain("dancers");
    for (const kind of ["print", "recipe", "music", "dance"]) {
      const p = sketchPrompt(kind, "x");
      expect(p).not.toContain("phone");
      expect(p).not.toContain("wireframe");
    }
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
    for (const kind of [
      "hardware",
      "software",
      "print",
      "recipe",
      "music",
      "dance",
    ]) {
      const p = portraitPrompt(kind);
      expect(p).toContain("plain white background");
      expect(p).toContain("no scenery");
    }
  });

  it("every other kind realizes its own subject, never phone screens", () => {
    expect(portraitPrompt("print")).toContain("printed piece");
    expect(portraitPrompt("recipe")).toContain("dish");
    expect(portraitPrompt("music")).toContain("music concept");
    expect(portraitPrompt("dance")).toContain("dancers");
    for (const kind of ["print", "recipe", "music", "dance"]) {
      expect(portraitPrompt(kind)).not.toContain("phone screens");
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
    const rd = reviseSketchPrompt("dance", "bigger leaps");
    expect(rd).toContain("bigger leaps");
    expect(rd).toContain("black and white");
    expect(rd).not.toContain("phone");
    const rr = revisePortraitPrompt("recipe", "rustic");
    expect(rr).toContain("rustic");
    expect(rr).toContain("same subject and composition");
    expect(rr).not.toContain("phone screens");
  });
});
