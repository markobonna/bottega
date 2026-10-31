import { describe, expect, it } from "vitest";
import { crc32, fabReadme, strBytes, zipStore } from "./fabpack";

function parseNames(zip: Uint8Array): string[] {
  const names: string[] = [];
  const view = new DataView(zip.buffer, zip.byteOffset, zip.byteLength);
  let at = 0;
  while (view.getUint32(at, true) === 0x04034b50) {
    const len = view.getUint16(at + 26, true);
    const extra = view.getUint16(at + 28, true);
    const size = view.getUint32(at + 18, true);
    names.push(
      new TextDecoder().decode(zip.subarray(at + 30, at + 30 + len)),
    );
    at += 30 + len + extra + size;
  }
  return names;
}

describe("fabpack", () => {
  it("crc32 matches the standard check value", () => {
    expect(crc32(strBytes("123456789")).toString(16)).toBe("cbf43926");
  });
  it("builds a parseable stored zip", () => {
    const zip = zipStore([
      { name: "a.txt", data: strBytes("hello") },
      { name: "b/c.md", data: strBytes("# hi") },
    ]);
    expect(parseNames(zip)).toEqual(["a.txt", "b/c.md"]);
    // End-of-central-directory record closes the file.
    const view = new DataView(zip.buffer, zip.byteOffset, zip.byteLength);
    expect(view.getUint32(zip.length - 22, true)).toBe(0x06054b50);
    expect(view.getUint16(zip.length - 22 + 8, true)).toBe(2);
    // Deterministic: same input, same bytes.
    expect(zipStore([{ name: "a.txt", data: strBytes("hello") }])).toEqual(
      zipStore([{ name: "a.txt", data: strBytes("hello") }]),
    );
  });
  it("readme discloses the envelope and the ordering rule", () => {
    const out = fabReadme({
      name: "Rack",
      workshopName: "Garage",
      kindLabel: "Hardware",
      files: [{ name: "rack-brief.md", what: "Requirements" }],
    });
    expect(out).toContain("rack-brief.md: Requirements");
    expect(out).toContain("do not manufacture from it");
    expect(out).toContain("Nothing is ordered until");
  });
});
