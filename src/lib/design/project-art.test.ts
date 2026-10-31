import { describe, expect, it } from "vitest";
import {
  arrivalHead,
  arrivalLine,
  detectMedium,
  effectiveStage,
  isMediumId,
  MEDIUM_IDS,
  MEDIUM_QUESTIONS,
  mediumForKind,
  menuLines,
  nextStage,
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

describe("MEDIUM_QUESTIONS", () => {
  it("covers every medium with real questions", () => {
    for (const id of MEDIUM_IDS) {
      expect(MEDIUM_QUESTIONS[id].length).toBeGreaterThan(0);
      for (const q of MEDIUM_QUESTIONS[id]) {
        expect(q.endsWith("?")).toBe(true);
      }
    }
  });
});

describe("effectiveStage / nextStage", () => {
  it("prefers a stored stage, else derives from the version", () => {
    expect(effectiveStage("sent", 1)).toBe("sent");
    expect(effectiveStage(null, 1)).toBe("sketch");
    expect(effectiveStage("bogus", 2)).toBe("shape");
  });
  it("advances sketch to shape to build, then stops", () => {
    expect(nextStage("sketch")).toBe("shape");
    expect(nextStage("shape")).toBe("build");
    expect(nextStage("build")).toBeNull();
    expect(nextStage("sent")).toBeNull();
    expect(nextStage("arrived")).toBeNull();
  });
});

describe("arrival", () => {
  it("heads each medium like the design", () => {
    expect(arrivalHead("hardware")).toBe("It's here!");
    expect(arrivalHead("dance")).toBe("Showtime!");
  });
  it("lines name the project, room and surface", () => {
    expect(
      arrivalLine("garage", "The Garage", "Bike rack", "hardware"),
    ).toContain("on the workbench");
    expect(arrivalLine("cafe", "Café", "Menu", "print")).toContain(
      "back from the printer",
    );
  });
});

describe("menuLines", () => {
  const collections = [
    {
      id: "orders",
      fields: [
        { id: "customer", type: "text" },
        { id: "item", type: "text" },
      ],
    },
    { id: "specials", fields: [{ id: "name", type: "text" }] },
  ];
  it("prefers a name field anywhere, then item", () => {
    const records = {
      orders: [{ data: { item: "Sourdough" } }],
      specials: [{ data: { name: "Morning bun" } }],
    };
    expect(menuLines(collections, records)).toEqual(["Morning bun"]);
    expect(menuLines(collections, { orders: records.orders })).toEqual([
      "Sourdough",
    ]);
  });
  it("returns nothing without text", () => {
    expect(menuLines([], {})).toEqual([]);
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
