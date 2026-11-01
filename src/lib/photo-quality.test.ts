import { describe, expect, it } from "vitest";

import { DARK_LUMINANCE, isDim, luminanceOf } from "./photo-quality";

function pixels(...rgb: [number, number, number][]): Uint8ClampedArray {
  const out = new Uint8ClampedArray(rgb.length * 4);
  rgb.forEach(([r, g, b], i) => {
    out[i * 4] = r;
    out[i * 4 + 1] = g;
    out[i * 4 + 2] = b;
    out[i * 4 + 3] = 255;
  });
  return out;
}

describe("luminanceOf", () => {
  it("reads black as 0 and white as 1", () => {
    expect(luminanceOf(pixels([0, 0, 0]))).toBe(0);
    expect(luminanceOf(pixels([255, 255, 255]))).toBeCloseTo(1, 5);
  });
  it("reads mid grey near 0.5", () => {
    expect(luminanceOf(pixels([128, 128, 128]))).toBeCloseTo(0.5, 1);
  });
  it("weights green above red above blue", () => {
    const g = luminanceOf(pixels([0, 255, 0]));
    const r = luminanceOf(pixels([255, 0, 0]));
    const b = luminanceOf(pixels([0, 0, 255]));
    expect(g).toBeGreaterThan(r);
    expect(r).toBeGreaterThan(b);
  });
  it("averages across pixels", () => {
    expect(
      luminanceOf(
        pixels(
          [0, 0, 0],
          [255, 255, 255],
        ),
      ),
    ).toBeCloseTo(0.5, 5);
  });
  it("returns 0 for empty or ragged input", () => {
    expect(luminanceOf(new Uint8ClampedArray(0))).toBe(0);
    expect(luminanceOf(new Uint8ClampedArray(3))).toBe(0);
  });
});

describe("isDim", () => {
  it("flags near-black and clears daylight", () => {
    expect(isDim(0.05)).toBe(true);
    expect(isDim(0.6)).toBe(false);
    expect(DARK_LUMINANCE).toBeGreaterThan(0);
    expect(DARK_LUMINANCE).toBeLessThan(0.5);
  });
});
