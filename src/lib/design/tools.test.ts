import { describe, expect, it } from "vitest";
import { stageLabelsFor, stepLabel, stepPosition } from "./tools";

describe("stageLabelsFor", () => {
  it("gives software three steps ending at Download", () => {
    expect(stageLabelsFor("software", "Download", "Installed")).toEqual([
      "Sketch",
      "Prototype",
      "Download",
    ]);
  });
  it("keeps five steps for hardware", () => {
    expect(stageLabelsFor("hardware", "x", "y")).toHaveLength(5);
  });
});

describe("stepPosition", () => {
  it("passes other mediums through", () => {
    expect(stepPosition("hardware", 4)).toBe(4);
    expect(stepPosition("print", 3)).toBe(3);
  });
  it("maps software stages onto three shown steps", () => {
    expect(stepPosition("software", 0)).toBe(0);
    expect(stepPosition("software", 1)).toBe(1);
    expect(stepPosition("software", 2)).toBe(2);
  });
  it("folds stray software Test/Go-live indexes onto Download", () => {
    expect(stepPosition("software", 3)).toBe(2);
    expect(stepPosition("software", 4)).toBe(2);
  });
});

describe("stepLabel", () => {
  const labels = stageLabelsFor("software", "Download", "Installed");
  it("names software stages by shown position", () => {
    expect(stepLabel(labels, "software", 0)).toBe("Sketch");
    expect(stepLabel(labels, "software", 2)).toBe("Download");
    expect(stepLabel(labels, "software", 4)).toBe("Download");
  });
  it("falls back to the first label off the ends", () => {
    expect(stepLabel(labels, "software", -1)).toBe("Sketch");
  });
});
