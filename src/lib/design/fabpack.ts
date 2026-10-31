// Minimal stored (uncompressed) ZIP writer for the RFQ fab pack.
// Pure: no DOM, no network. Names and contents are UTF-8.

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

export function crc32(bytes: Uint8Array): number {
  let c = 0xffffffff;
  for (const b of bytes) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

export interface ZipFile {
  name: string;
  data: Uint8Array;
}

export function strBytes(s: string): Uint8Array {
  return new TextEncoder().encode(s);
}

/** Build a stored ZIP. Fixed timestamps keep output deterministic. */
export function zipStore(files: ZipFile[]): Uint8Array {
  const enc = new TextEncoder();
  const parts: Uint8Array[] = [];
  const central: Uint8Array[] = [];
  let offset = 0;
  const push = (buf: Uint8Array) => {
    parts.push(buf);
    offset += buf.length;
  };
  for (const f of files) {
    const name = enc.encode(f.name);
    const head = new DataView(new ArrayBuffer(30));
    head.setUint32(0, 0x04034b50, true);
    head.setUint16(4, 20, true);
    head.setUint16(6, 0x0800, true); // UTF-8 names
    head.setUint16(8, 0, true); // stored
    head.setUint16(10, 0, true); // mod time
    head.setUint16(12, 0x21, true); // mod date (1980-01-01)
    head.setUint32(14, crc32(f.data), true);
    head.setUint32(18, f.data.length, true);
    head.setUint32(22, f.data.length, true);
    head.setUint16(26, name.length, true);
    head.setUint16(28, 0, true);
    const localOffset = offset;
    push(new Uint8Array(head.buffer));
    push(name);
    push(f.data);
    const c = new DataView(new ArrayBuffer(46));
    c.setUint32(0, 0x02014b50, true);
    c.setUint16(4, 20, true);
    c.setUint16(6, 20, true);
    c.setUint16(8, 0x0800, true);
    c.setUint16(10, 0, true);
    c.setUint16(12, 0, true);
    c.setUint16(14, 0x21, true);
    c.setUint32(16, crc32(f.data), true);
    c.setUint32(20, f.data.length, true);
    c.setUint32(24, f.data.length, true);
    c.setUint16(28, name.length, true);
    c.setUint32(42, localOffset, true);
    const cBytes = new Uint8Array(46 + name.length);
    cBytes.set(new Uint8Array(c.buffer), 0);
    cBytes.set(name, 46);
    central.push(cBytes);
  }
  const centralOffset = offset;
  let centralSize = 0;
  for (const c of central) {
    push(c);
    centralSize += c.length;
  }
  const end = new DataView(new ArrayBuffer(22));
  end.setUint32(0, 0x06054b50, true);
  end.setUint16(8, files.length, true);
  end.setUint16(10, files.length, true);
  end.setUint32(12, centralSize, true);
  end.setUint32(16, centralOffset, true);
  push(new Uint8Array(end.buffer));
  const out = new Uint8Array(offset);
  let at = 0;
  for (const p of parts) {
    out.set(p, at);
    at += p.length;
  }
  return out;
}

/** README packed with every fab pack: what's inside, what's real, how to order. */
export function fabReadme(args: {
  name: string;
  workshopName: string;
  kindLabel: string;
  files: { name: string; what: string }[];
}): string {
  const lines = args.files.map((f) => `- ${f.name}: ${f.what}`).join("\n");
  return `RFQ pack for "${args.name}" (${args.kindLabel}, ${args.workshopName}), made with Bottega.

WHAT'S INSIDE
${lines}

WHAT'S REAL
The brief and drawings describe a real project with real requirements.
The envelope STL (if included) is for size-check only — do not manufacture from it.
CNC and sheet-metal quotes need STEP/DXF plus a dimensioned drawing; reply to the
request and we will finalize them with you. 3D-print and laser quotes can usually
start from STL/SVG/DXF directly.

HOW TO ORDER
Reply with a price, lead time, and payment link. Nothing is ordered until the
customer pays your reply.
`;
}
