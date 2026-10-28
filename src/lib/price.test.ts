import { describe, expect, it } from "vitest";

import type { AppSpec, Block } from "./spec/schema";
import cole from "./spec/fixtures/cole.json";
import { formatMoney, quote } from "./price";

type PriceLine = Extract<Block, { type: "price" }>["lines"][number];

const coleLines = (
  cole as unknown as AppSpec
).screens
  .flatMap((s) => s.blocks)
  .find((b) => b.type === "price") as unknown as { lines: PriceLine[] };

describe("price", () => {
  it("totals Cole's lines: 3/1/2 -> $295.00", () => {
    const result = quote(
      { data: { scratches: 3, chips: 1, missing_veneer: 2 } },
      coleLines.lines,
    );
    expect(result.total).toBe(29500);
    expect(result.items.map((i) => i.amount)).toEqual([7500, 4000, 18000]);
    expect(formatMoney(result.total, "USD")).toBe("$295.00");
  });

  it("skips zero-qty items", () => {
    const result = quote(
      { data: { scratches: 0, chips: 1, missing_veneer: 0 } },
      coleLines.lines,
    );
    expect(result.items.map((i) => i.label)).toEqual(["Chip fill"]);
    expect(result.total).toBe(4000);
  });

  it("0.1 + 0.2 style rates don't drift", () => {
    const lines = [
      { field: "a", label: "A", rate: 0.1, unit: "each" },
      { field: "b", label: "B", rate: 0.2, unit: "each" },
    ] as PriceLine[];
    expect(quote({ data: { a: 1, b: 1 } }, lines).total).toBe(30);
  });

  it("unknown currency falls back to USD formatting", () => {
    expect(formatMoney(29500, "XX")).toBe(formatMoney(29500, "USD"));
  });
});
