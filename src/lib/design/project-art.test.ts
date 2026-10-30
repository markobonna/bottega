import { describe, expect, it } from "vitest";
import {
  detectMedium,
  isMediumId,
  mediumForKind,
  stageForVersion,
} from "./project-art";

describe("stageForVersion", () => {
  it("maps v1 to sketch, v2 to shape, v3 to build, v4+ to arrived", () => {
    expect(stageForVersion(1)).toBe("sketch");
    expect(stageForVersion(2)).toBe("shape");
    expect(stageForVersion(3)).toBe("build");
    expect(stageForVersion(4)).toBe("arrived");
    expect(stageForVersion(25)).toBe("arrived");
  });
});

describe("mediumForKind", () => {
  it("passes the seven mediums through and defaults the rest to software", () => {
    for (const k of [
      "hardware",
      "software",
      "music",
      "dance",
      "print",
      "recipe",
      "space",
    ]) {
      expect(mediumForKind(k)).toBe(k);
    }
    expect(mediumForKind("")).toBe("software");
    expect(mediumForKind("video")).toBe("software");
  });
});

describe("isMediumId", () => {
  it("accepts the seven mediums only", () => {
    expect(isMediumId("dance")).toBe(true);
    expect(isMediumId("video")).toBe(false);
  });
});

describe("detectMedium", () => {
  it("detects hardware from physical-thing words", () => {
    expect(detectMedium("Espresso machine v2")).toBe("hardware");
    expect(detectMedium("a wall rack for three bikes")).toBe("hardware");
    expect(detectMedium("can you create a new chair")).toBe("hardware");
    expect(detectMedium("a shelf for 40 cookbooks")).toBe("hardware");
  });
  it("detects software from app words", () => {
    expect(detectMedium("a loyalty app for regulars")).toBe("software");
    expect(detectMedium("an online ordering page")).toBe("software");
  });
  it("detects the other five mediums", () => {
    expect(detectMedium("a song for my sister's wedding")).toBe("music");
    expect(detectMedium("a routine for the spring show")).toBe("dance");
    expect(detectMedium("an autumn menu board")).toBe("print");
    expect(detectMedium("a new house sauce")).toBe("recipe");
    expect(detectMedium("a seating layout for the room")).toBe("space");
  });
  it("defaults to software when nothing matches", () => {
    expect(detectMedium("I keep a list of things I keep losing")).toBe(
      "software",
    );
  });
  it("uses the given fallback when nothing matches", () => {
    expect(detectMedium("I keep a list of things I keep losing", "dance")).toBe(
      "dance",
    );
  });
  it("lets the earlier medium win ties, like the prototype", () => {
    expect(detectMedium("fix my app")).toBe("hardware");
  });
});
