import { readFileSync, writeFileSync } from "node:fs";

import { segment } from "../src/lib/sam";

const COLORS = ["#e03131", "#1c7ed6", "#2f9e44", "#f08c00", "#7048e8", "#0c8599"];

// Live check for see: segment a local photo, print counts, write an SVG overlay.
async function main() {
  const [photo, ...nouns] = process.argv.slice(2).filter((a) => a !== "--");
  if (!photo || nouns.length < 1 || nouns.length > 6) {
    console.error('usage: pnpm run try-see -- <photo.jpg> "noun" [...]');
    process.exit(1);
  }
  const mime = photo.endsWith(".png") ? "image/png" : "image/jpeg";
  const dataUrl = `data:${mime};base64,${readFileSync(photo).toString("base64")}`;
  const results = await Promise.all(nouns.map((noun) => segment(dataUrl, noun)));
  const { w, h } = results[0];
  const overlays = results.flatMap((r, ni) =>
    r.objects.map((o) => {
      const [x1, y1, x2, y2] = o.box;
      return (
        `<g transform="translate(${x1},${y1})">` +
        `<rect x="0" y="0" width="${x2 - x1}" height="${y2 - y1}" fill="none" ` +
        `stroke="${COLORS[ni % COLORS.length]}" stroke-width="3"/>` +
        (o.path
          ? `<path d="${o.path}" fill="${COLORS[ni % COLORS.length]}" fill-opacity="0.35"/>`
          : "") +
        `</g>`
      );
    }),
  );
  writeFileSync(
    `${photo}.svg`,
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">` +
      `<image href="${dataUrl}" x="0" y="0" width="${w}" height="${h}"/>` +
      overlays.join("") +
      `</svg>`,
  );
  for (const [i, noun] of nouns.entries()) {
    const objects = results[i].objects;
    const mean = objects.length
      ? (objects.reduce((s, o) => s + o.c, 0) / objects.length).toFixed(2)
      : "—";
    console.log(`${noun}: ${objects.length} (mean c ${mean})`);
  }
  console.log(`wrote ${photo}.svg (${w}x${h})`);
}

main().catch((e: unknown) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
