import { describe, expect, test } from "vitest";
import {
  answer,
  createBrain,
  mistakes,
  prob,
  restore,
  sigmoid,
  snapshot,
  train,
  zero,
  type Brain,
  type Example,
} from "./brain";

function converge(n: number, data: Example[]): Brain {
  const br = createBrain(
    ["no", "yes"],
    Array.from({ length: n }, (_, k) => `d${k}`),
  );
  br.train = data;
  zero(br);
  train(br, 20);
  return br;
}

describe("brain math", () => {
  test("sigmoid(0) = 0.5", () => {
    expect(sigmoid(0)).toBe(0.5);
  });

  test("N = 4 separable set: 0 mistakes within 20 rounds, curve falls", () => {
    const br = converge(4, [
      { x: [1, 0, 0, 0], y: 1 },
      { x: [0, 1, 0, 0], y: 1 },
      { x: [0, 0, 1, 0], y: 0 },
      { x: [0, 0, 0, 1], y: 0 },
    ]);
    expect(mistakes(br)).toBe(0);
    expect(br.curve[br.curve.length - 1]).toBeLessThan(br.curve[0]);
  });

  test("N = 2 separable set: 0 mistakes within 20 rounds, curve falls", () => {
    const br = converge(2, [
      { x: [1, 0], y: 1 },
      { x: [0, 1], y: 0 },
    ]);
    expect(mistakes(br)).toBe(0);
    expect(br.curve[br.curve.length - 1]).toBeLessThan(br.curve[0]);
  });

  test("N = 6 separable set: 0 mistakes within 20 rounds, curve falls", () => {
    const br = converge(6, [
      { x: [1, 0, 0, 0, 0, 0], y: 1 },
      { x: [0, 1, 0, 0, 0, 0], y: 1 },
      { x: [0, 0, 1, 0, 0, 0], y: 1 },
      { x: [0, 0, 0, 1, 0, 0], y: 0 },
      { x: [0, 0, 0, 0, 1, 0], y: 0 },
      { x: [0, 0, 0, 0, 0, 1], y: 0 },
    ]);
    expect(mistakes(br)).toBe(0);
    expect(br.curve[br.curve.length - 1]).toBeLessThan(br.curve[0]);
  });

  test("weights and bias stay in -6..6 after 200 rounds", () => {
    const br = createBrain(["no", "yes"], ["d0", "d1"]);
    br.train = [{ x: [10, 10], y: 1 }];
    zero(br);
    train(br, 200);
    for (const w of br.w) expect(Math.abs(w)).toBeLessThanOrEqual(6);
    expect(Math.abs(br.b)).toBeLessThanOrEqual(6);
    // Large inputs slam the weights into the rails: the clamp engages.
    expect(br.w).toEqual([6, 6]);
  });

  test("answer().conf is always >= 0.5", () => {
    const br = converge(2, [
      { x: [1, 0], y: 1 },
      { x: [0, 1], y: 0 },
    ]);
    for (const x of [[1, 0], [0, 1], [0.5, 0.5], [0, 0], [1, 1]]) {
      expect(answer(br, x).conf).toBeGreaterThanOrEqual(0.5);
    }
  });

  test("prob throws on a wrong-length x", () => {
    const br = createBrain(["no", "yes"], ["d0", "d1"]);
    expect(() => prob(br, [1])).toThrow();
    expect(() => prob(br, [1, 0, 0])).toThrow();
  });

  test("createBrain throws outside 2..6 dims", () => {
    expect(() => createBrain(["no", "yes"], ["d0"])).toThrow();
    expect(() =>
      createBrain(["no", "yes"], ["d0", "d1", "d2", "d3", "d4", "d5", "d6"]),
    ).toThrow();
  });

  test("snapshot/restore round-trips exactly", () => {
    const br = createBrain(["plain", "fancy"], ["d0", "d1"]);
    br.train = [
      { id: "a", x: [1, 0], y: 1 },
      { id: "b", x: [0, 1], y: 0 },
    ];
    zero(br);
    train(br, 5);
    const revived = restore(
      JSON.parse(JSON.stringify(snapshot(br))),
      br.train,
    );
    expect(revived).toEqual(br);
  });
});
