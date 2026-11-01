// Client-safe photo checks. Warn-and-allow: a dim photo gets a nudge and a
// preview, never a refusal. The pure luminance math is tested; the canvas
// sampling runs in the browser.

export const DARK_LUMINANCE = 0.16;

/** Mean relative luminance of RGBA pixels, 0 (black) to 1 (white). */
export function luminanceOf(data: Uint8ClampedArray): number {
  if (data.length === 0 || data.length % 4 !== 0) return 0;
  let sum = 0;
  const n = data.length / 4;
  for (let i = 0; i < data.length; i += 4) {
    sum +=
      (0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2]) / 255;
  }
  return sum / n;
}

export function isDim(luminance: number): boolean {
  return luminance < DARK_LUMINANCE;
}

/** Downscale to a 48px thumbnail and read its mean luminance. */
export async function meanLuminance(blob: Blob): Promise<number> {
  const bitmap = await createImageBitmap(blob);
  try {
    const size = 48;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (!ctx) return 1;
    ctx.drawImage(bitmap, 0, 0, size, size);
    return luminanceOf(ctx.getImageData(0, 0, size, size).data);
  } finally {
    bitmap.close();
  }
}
