export interface RgbColor {
  r: number;
  g: number;
  b: number;
}

// Pure pixel math, no Canvas/OffscreenCanvas — keeps this testable under
// plain Node (OffscreenCanvas isn't available there, and pulling it in
// just for a solid circle would be overkill). Fills a size x size RGBA
// buffer with a solid circle, transparent outside it.
export function renderCircleIcon(
  size: number,
  color: RgbColor,
): Uint8ClampedArray<ArrayBuffer> {
  const data = new Uint8ClampedArray(new ArrayBuffer(size * size * 4));
  const center = (size - 1) / 2;
  const radius = size / 2 - 1;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = x - center;
      const dy = y - center;
      const inside = dx * dx + dy * dy <= radius * radius;
      const i = (y * size + x) * 4;
      data[i] = color.r;
      data[i + 1] = color.g;
      data[i + 2] = color.b;
      data[i + 3] = inside ? 255 : 0;
    }
  }

  return data;
}
