import { describe, expect, it } from "vitest";

import {
  clampParams,
  cutList,
  parts,
  toDxf,
  toStl,
  type ShelfParams,
} from "./shelf";

const P: ShelfParams = {
  width: 900,
  height: 1200,
  depth: 300,
  shelves: 5,
  thickness: 18,
};

function stlParts(bytes: Uint8Array): {
  count: number;
  normals: number[][];
  verts: number[][];
} {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const count = view.getUint32(80, true);
  const normals: number[][] = [];
  const verts: number[][] = [];
  let at = 84;
  for (let i = 0; i < count; i++) {
    normals.push([
      view.getFloat32(at, true),
      view.getFloat32(at + 4, true),
      view.getFloat32(at + 8, true),
    ]);
    at += 12;
    for (let v = 0; v < 3; v++) {
      verts.push([
        view.getFloat32(at, true),
        view.getFloat32(at + 4, true),
        view.getFloat32(at + 8, true),
      ]);
      at += 12;
    }
    at += 2;
  }
  return { count, normals, verts };
}

describe("shelf", () => {
  it("part count = 2 + shelves", () => {
    expect(parts(P)).toHaveLength(2 + P.shelves);
    expect(parts({ ...P, shelves: 2 })).toHaveLength(4);
  });

  it("STL byte length = 84 + 50 × 12 × parts", () => {
    const boxes = parts(P);
    expect(toStl(boxes).byteLength).toBe(84 + 50 * 12 * boxes.length);
  });

  it("STL bounding box equals width × depth × height", () => {
    const { verts } = stlParts(toStl(parts(P)));
    const xs = verts.map((v) => v[0]);
    const ys = verts.map((v) => v[1]);
    const zs = verts.map((v) => v[2]);
    expect(Math.min(...xs)).toBe(0);
    expect(Math.max(...xs)).toBe(P.width);
    expect(Math.min(...ys)).toBe(0);
    expect(Math.max(...ys)).toBe(P.depth);
    expect(Math.min(...zs)).toBe(0);
    expect(Math.max(...zs)).toBe(P.height);
  });

  it("every normal is unit length", () => {
    const { normals } = stlParts(toStl(parts(P)));
    expect(normals.length).toBeGreaterThan(0);
    for (const n of normals) {
      expect(Math.hypot(n[0], n[1], n[2])).toBe(1);
    }
  });

  it("cutList quantities add up", () => {
    const boxes = parts(P);
    const rows = cutList(boxes);
    expect(rows.reduce((n, r) => n + r.qty, 0)).toBe(boxes.length);
    expect(rows).toHaveLength(2);
  });

  it("DXF has sections and 4 LINEs per unique part", () => {
    const boxes = parts(P);
    const dxf = toDxf(boxes);
    expect(dxf).toContain("SECTION");
    expect(dxf).toContain("ENTITIES");
    expect(dxf.trimEnd().endsWith("EOF")).toBe(true);
    const lineCount = dxf.split("\n").filter((l) => l === "LINE").length;
    expect(lineCount).toBe(4 * cutList(boxes).length);
  });

  it("clampParams clamps out-of-range values", () => {
    expect(
      clampParams({
        width: 9999,
        height: 10,
        depth: 300.4,
        shelves: 99,
        thickness: 18.6,
      }),
    ).toEqual({ width: 1800, height: 300, depth: 300, shelves: 8, thickness: 19 });
  });
});
