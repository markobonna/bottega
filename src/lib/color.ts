// Fallback color features for Teach when no model key exists. The Tiny Brain
// source this ports from is not in the repo, so this is a clean-room
// implementation of the spec: 4 color shares (Red, Yellow, Green, Blue).
// Dim order: 0 red, 1 yellow, 2 green, 3 blue.

export type ColorShares = [number, number, number, number];

export const COLOR_DIM_NAMES = ["Red", "Yellow", "Green", "Blue"];

// Classify one pixel (0..255 channels) into a color bucket by opponent
// scores. Ties go to the lowest index.
export function bucket(r: number, g: number, b: number): number {
  const scores = [
    r - (g + b) / 2,
    (r + g) / 2 - b,
    g - (r + b) / 2,
    b - (r + g) / 2,
  ];
  let best = 0;
  for (let i = 1; i < 4; i++) {
    if (scores[i] > scores[best]) best = i;
  }
  return best;
}

export function featsFromPixels(
  pixels: { r: number; g: number; b: number }[],
): ColorShares {
  if (pixels.length === 0) return [0.25, 0.25, 0.25, 0.25];
  const counts = [0, 0, 0, 0];
  for (const p of pixels) counts[bucket(p.r, p.g, p.b)]++;
  return counts.map((c) => c / pixels.length) as ColorShares;
}

export function featsFrom(imageData: ImageData): ColorShares {
  const pixels: { r: number; g: number; b: number }[] = [];
  for (let i = 0; i < imageData.data.length; i += 4) {
    pixels.push({
      r: imageData.data[i],
      g: imageData.data[i + 1],
      b: imageData.data[i + 2],
    });
  }
  return featsFromPixels(pixels);
}

// Browser: downscale to 64x64, crop a 15% border (framing, not the thing),
// and read color shares. Rotation-invariant, so EXIF orientation is ignored.
export async function colorFeatures(blob: Blob): Promise<ColorShares> {
  const bitmap = await createImageBitmap(blob);
  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D unavailable.");
  ctx.drawImage(bitmap, 0, 0, 64, 64);
  bitmap.close();
  const inset = Math.round(64 * 0.15);
  const data = ctx.getImageData(inset, inset, 64 - inset * 2, 64 - inset * 2);
  return featsFrom(data);
}
