import { writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { image } from "../src/lib/meta";

// Live check for draw: generate one square picture, write it to a temp PNG.
async function main() {
  const [prompt, ...rest] = process.argv.slice(2).filter((a) => a !== "--");
  if (!prompt || rest.length > 0) {
    console.error('usage: pnpm run try-draw -- "a bakery display photo of ..."');
    process.exit(1);
  }
  const bytes = await image(`${prompt}, no text, no logos, no people's faces`);
  const out = join(tmpdir(), `bottega-draw-${Date.now()}.png`);
  writeFileSync(out, bytes);
  console.log(`wrote ${out} (${bytes.length} bytes)`);
}

main().catch((e: unknown) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
