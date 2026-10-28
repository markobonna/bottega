import { describe, expect, test } from "vitest";
import { checkValues } from "./values";
import type { Collection } from "./spec/schema";

const coll: Collection = {
  id: "c",
  name: "C",
  fields: [
    { id: "t", name: "T", type: "text" },
    { id: "n", name: "N", type: "number" },
    { id: "d", name: "D", type: "date" },
    { id: "s", name: "S", type: "choice", options: ["a", "b"] },
    { id: "b", name: "B", type: "bool" },
    { id: "p", name: "P", type: "photo" },
  ],
};

describe("checkValues", () => {
  test("each type passes and coerces", () => {
    const result = checkValues(coll, {
      t: "hi",
      n: "3",
      d: "2026-10-27",
      s: "a",
      b: "false",
      p: "uid123/app456/x.png",
    });
    expect(result).toEqual({
      ok: true,
      data: {
        t: "hi",
        n: 3,
        d: "2026-10-27",
        s: "a",
        b: false,
        p: "uid123/app456/x.png",
      },
      issues: [],
    });
  });

  test("native values pass through", () => {
    const result = checkValues(coll, {
      n: 4.5,
      b: true,
      d: new Date("2026-01-02T00:00:00Z"),
    });
    expect(result.ok).toBe(true);
    expect(result.data).toEqual({ n: 4.5, b: true, d: "2026-01-02" });
  });

  test("unknown keys are dropped", () => {
    const result = checkValues(coll, { t: "hi", nope: 1 });
    expect(result.ok).toBe(true);
    expect(result.data).toEqual({ t: "hi" });
  });

  test("null values are dropped", () => {
    const result = checkValues(coll, { t: null, n: "2" });
    expect(result.ok).toBe(true);
    expect(result.data).toEqual({ n: 2 });
  });

  test("bad choice is rejected", () => {
    const result = checkValues(coll, { s: "zzz" });
    expect(result.ok).toBe(false);
    expect(result.issues).toEqual(["s: must be one of: a, b"]);
    expect(result.data).toEqual({});
  });

  test("foreign photo paths are rejected", () => {
    for (const p of ["flat.png", "/etc/x.png", "../a/b.png", "a/b/", ""]) {
      const result = checkValues(coll, { p });
      expect(result.ok).toBe(false);
      expect(result.data).toEqual({});
    }
  });

  test("bad numbers, dates and bools are rejected", () => {
    expect(checkValues(coll, { n: "abc" }).ok).toBe(false);
    expect(checkValues(coll, { n: "" }).ok).toBe(false);
    expect(checkValues(coll, { d: "10/27/2026" }).ok).toBe(false);
    expect(checkValues(coll, { d: "2026-13-01" }).ok).toBe(false);
    expect(checkValues(coll, { d: "2026-02-30" }).ok).toBe(false);
    expect(checkValues(coll, { b: "yes" }).ok).toBe(false);
    expect(checkValues(coll, { t: { deep: true } }).ok).toBe(false);
  });
});
