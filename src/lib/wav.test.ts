import { describe, expect, it } from "vitest";

import { downmix, encodeWav } from "./wav";

function text(bytes: Uint8Array, at: number, len: number): string {
  return String.fromCharCode(...bytes.slice(at, at + len));
}

describe("wav", () => {
  it("writes a valid 16-bit mono header", () => {
    const bytes = encodeWav(new Float32Array(100), 16000);
    const view = new DataView(bytes.buffer);
    expect(text(bytes, 0, 4)).toBe("RIFF");
    expect(text(bytes, 8, 4)).toBe("WAVE");
    expect(text(bytes, 12, 4)).toBe("fmt ");
    expect(text(bytes, 36, 4)).toBe("data");
    expect(view.getUint16(20, true)).toBe(1);
    expect(view.getUint16(22, true)).toBe(1);
    expect(view.getUint32(24, true)).toBe(16000);
    expect(view.getUint16(34, true)).toBe(16);
    expect(bytes.length).toBe(44 + 2 * 100);
  });

  it("encodes full scale and clamps", () => {
    const bytes = encodeWav(new Float32Array([1, -1, 1.5, -2, 0]), 16000);
    const view = new DataView(bytes.buffer);
    expect(view.getInt16(44, true)).toBe(32767);
    expect(view.getInt16(46, true)).toBe(-32768);
    expect(view.getInt16(48, true)).toBe(32767);
    expect(view.getInt16(50, true)).toBe(-32768);
    expect(view.getInt16(52, true)).toBe(0);
  });

  it("downmix averages channels", () => {
    const out = downmix([
      new Float32Array([1, 0.5, -1]),
      new Float32Array([0, 0.5, 1]),
    ]);
    expect([...out]).toEqual([0.5, 0.5, 0]);
    expect(downmix([]).length).toBe(0);
  });
});
