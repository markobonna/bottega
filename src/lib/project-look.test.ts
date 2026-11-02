import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  portraitPrompt,
  revisePortraitPrompt,
  reviseSketchPrompt,
  sketchPrompt,
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

  it("software sketch is a dynamic composition fitting the view", () => {
    const p = sketchPrompt("software", "x");
    expect(p).toContain("one dynamic composition filling the view");
    expect(p).toContain("everything fully inside the frame");
    expect(p).toContain("no icon grid");
    expect(p).not.toContain("no multiple panels");
  });

  it("portrait grows out of the sketch, same subject", () => {
    expect(portraitPrompt("hardware")).toContain("same object");
    expect(portraitPrompt("software")).toContain("same screens");
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
    expect(w).toContain("one dynamic composition filling the view");
    expect(w).toContain("everything fully inside the frame");
    expect(w).toContain("no icon grid");
    const r = revisePortraitPrompt("brass finish");
    expect(r).toContain("brass finish");
    expect(r).toContain("same object and composition");
    expect(r).toContain("plain white background");
    expect(r).toContain("no scenery");
  });
});
