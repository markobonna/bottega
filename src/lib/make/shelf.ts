// Pure shelf geometry: params -> parts -> binary STL / cut list / DXF.
// Units are millimetres. X = width, Y = depth, Z = height.

export interface ShelfParams {
  width: number;
  height: number;
  depth: number;
  shelves: number;
  thickness: number;
}

export interface Box {
  name: string;
  x: number;
  y: number;
  z: number;
  w: number;
  d: number;
  h: number;
}

export interface CutRow {
  name: string;
  length: number;
  width: number;
  thickness: number;
  qty: number;
}

export const PARAM_LIMITS: Record<
  keyof ShelfParams,
  { min: number; max: number; label: string }
> = {
  width: { min: 400, max: 1800, label: "Width" },
  height: { min: 300, max: 2000, label: "Height" },
  depth: { min: 150, max: 400, label: "Depth" },
  shelves: { min: 2, max: 8, label: "Shelves" },
  thickness: { min: 12, max: 25, label: "Board thickness" },
};

export function clampParams(p: ShelfParams): ShelfParams {
  const out = {} as ShelfParams;
  for (const k of Object.keys(PARAM_LIMITS) as (keyof ShelfParams)[]) {
    const { min, max } = PARAM_LIMITS[k];
    out[k] = Math.min(max, Math.max(min, Math.round(p[k])));
  }
  return out;
}

export function parts(raw: ShelfParams): Box[] {
  const { width, height, depth, shelves, thickness: t } = clampParams(raw);
  const boxes: Box[] = [
    { name: "Side", x: 0, y: 0, z: 0, w: t, d: depth, h: height },
    {
      name: "Side",
      x: width - t,
      y: 0,
      z: 0,
      w: t,
      d: depth,
      h: height,
    },
  ];
  const boardW = width - 2 * t;
  for (let i = 0; i < shelves; i++) {
    boxes.push({
      name: "Shelf",
      x: t,
      y: 0,
      z: (i * (height - t)) / (shelves - 1),
      w: boardW,
      d: depth,
      h: t,
    });
  }
  return boxes;
}

type Vec = [number, number, number];

function boxTriangles(b: Box): { n: Vec; verts: [Vec, Vec, Vec] }[] {
  const [x0, y0, z0] = [b.x, b.y, b.z];
  const [x1, y1, z1] = [b.x + b.w, b.y + b.d, b.z + b.h];
  const A: Vec = [x0, y0, z0];
  const B: Vec = [x1, y0, z0];
  const C: Vec = [x1, y1, z0];
  const D: Vec = [x0, y1, z0];
  const E: Vec = [x0, y0, z1];
  const F: Vec = [x1, y0, z1];
  const G: Vec = [x1, y1, z1];
  const H: Vec = [x0, y1, z1];
  // Each quad split CCW viewed from outside; normal checked by cross product.
  return [
    { n: [0, 0, -1], verts: [A, D, C] },
    { n: [0, 0, -1], verts: [A, C, B] },
    { n: [0, 0, 1], verts: [E, F, G] },
    { n: [0, 0, 1], verts: [E, G, H] },
    { n: [0, -1, 0], verts: [A, B, F] },
    { n: [0, -1, 0], verts: [A, F, E] },
    { n: [0, 1, 0], verts: [D, H, G] },
    { n: [0, 1, 0], verts: [D, G, C] },
    { n: [-1, 0, 0], verts: [A, E, H] },
    { n: [-1, 0, 0], verts: [A, H, D] },
    { n: [1, 0, 0], verts: [B, C, G] },
    { n: [1, 0, 0], verts: [B, G, F] },
  ];
}

export function toStl(boxes: Box[]): Uint8Array {
  const tris = boxes.flatMap(boxTriangles);
  const buf = new ArrayBuffer(84 + 50 * tris.length);
  const view = new DataView(buf);
  const head = "bottega shelf";
  for (let i = 0; i < head.length; i++) view.setUint8(i, head.charCodeAt(i));
  view.setUint32(80, tris.length, true);
  let at = 84;
  for (const t of tris) {
    for (const v of t.n) {
      view.setFloat32(at, v, true);
      at += 4;
    }
    for (const vert of t.verts) {
      for (const v of vert) {
        view.setFloat32(at, v, true);
        at += 4;
      }
    }
    view.setUint16(at, 0, true);
    at += 2;
  }
  return new Uint8Array(buf);
}

export function cutList(boxes: Box[]): CutRow[] {
  const rows = new Map<string, CutRow>();
  for (const b of boxes) {
    const [length, width, thickness] = [b.w, b.d, b.h].sort((a, z) => z - a);
    const key = `${b.name}|${length}|${width}|${thickness}`;
    const row = rows.get(key);
    if (row) row.qty += 1;
    else rows.set(key, { name: b.name, length, width, thickness, qty: 1 });
  }
  return [...rows.values()];
}

export function toDxf(boxes: Box[]): string {
  const lines: string[] = ["0", "SECTION", "2", "HEADER", "0", "ENDSEC"];
  lines.push("0", "SECTION", "2", "ENTITIES");
  let cursor = 0;
  const line = (x1: number, y1: number, x2: number, y2: number) => {
    lines.push(
      "0",
      "LINE",
      "8",
      "CUT",
      "10",
      String(x1),
      "20",
      String(y1),
      "30",
      "0.0",
      "11",
      String(x2),
      "21",
      String(y2),
      "31",
      "0.0",
    );
  };
  for (const row of cutList(boxes)) {
    const x0 = cursor;
    const x1 = cursor + row.length;
    line(x0, 0, x1, 0);
    line(x1, 0, x1, row.width);
    line(x1, row.width, x0, row.width);
    line(x0, row.width, x0, 0);
    lines.push(
      "0",
      "TEXT",
      "8",
      "LABEL",
      "10",
      String(x0),
      "20",
      "-10",
      "30",
      "0.0",
      "40",
      "6",
      "1",
      `${row.name} ${row.length} x ${row.width}`,
    );
    cursor = x1 + 20;
  }
  lines.push("0", "ENDSEC", "0", "EOF");
  return lines.join("\n") + "\n";
}
