/**
 * Tiny binary-image primitives shared by the OCR pipeline. A `Bitmap` is a packed
 * 1-bit-per-pixel grid where `1` = ink (foreground) and `0` = background.
 */

export interface Bitmap {
  data: Uint8Array; // length width*height, values 0 | 1
  width: number;
  height: number;
}

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function makeBitmap(width: number, height: number): Bitmap {
  return { data: new Uint8Array(width * height), width, height };
}

export const getPx = (b: Bitmap, x: number, y: number): number =>
  x < 0 || y < 0 || x >= b.width || y >= b.height ? 0 : b.data[y * b.width + x];

/** Convert RGBA bytes (canvas ImageData) to an 8-bit grayscale array (0..255). */
export function toGrayscale(rgba: Uint8ClampedArray | Uint8Array, n: number): Uint8Array {
  const gray = new Uint8Array(n);
  for (let i = 0; i < n; i++) {
    const o = i * 4;
    // Rec. 601 luma; ignore alpha (screenshots are opaque).
    gray[i] = (rgba[o] * 77 + rgba[o + 1] * 150 + rgba[o + 2] * 29) >> 8;
  }
  return gray;
}

/** Otsu's method: the grayscale threshold (0..255) that best splits fore/background. */
export function otsuThreshold(gray: Uint8Array): number {
  const hist = new Array<number>(256).fill(0);
  for (let i = 0; i < gray.length; i++) hist[gray[i]]++;
  const total = gray.length;

  let sum = 0;
  for (let t = 0; t < 256; t++) sum += t * hist[t];

  let sumB = 0;
  let wB = 0;
  let best = 0;
  let threshold = 127;
  for (let t = 0; t < 256; t++) {
    wB += hist[t];
    if (wB === 0) continue;
    const wF = total - wB;
    if (wF === 0) break;
    sumB += t * hist[t];
    const mB = sumB / wB;
    const mF = (sum - sumB) / wF;
    const between = wB * wF * (mB - mF) * (mB - mF);
    if (between > best) {
      best = between;
      threshold = t;
    }
  }
  return threshold;
}

/**
 * Binarize grayscale to a Bitmap. Ink is taken to be the *minority* class so the
 * pipeline works for both light themes (dark digits on white) and dark themes
 * (light digits on black) without extra configuration.
 */
export function binarize(gray: Uint8Array, width: number, height: number): Bitmap {
  const t = otsuThreshold(gray);
  let belowCount = 0;
  for (let i = 0; i < gray.length; i++) if (gray[i] <= t) belowCount++;
  const inkIsBelow = belowCount <= gray.length - belowCount; // minority = ink

  const out = makeBitmap(width, height);
  for (let i = 0; i < gray.length; i++) {
    const below = gray[i] <= t;
    out.data[i] = (below === inkIsBelow ? 1 : 0) as number;
  }
  return out;
}

/** Tight ink bounding box within `region`, or null if it holds too little ink. */
export function inkBounds(b: Bitmap, region: Rect, minInk: number): Rect | null {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -1;
  let maxY = -1;
  let count = 0;
  const x1 = Math.min(b.width, region.x + region.width);
  const y1 = Math.min(b.height, region.y + region.height);
  for (let y = Math.max(0, region.y); y < y1; y++) {
    for (let x = Math.max(0, region.x); x < x1; x++) {
      if (b.data[y * b.width + x]) {
        count++;
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (count < minInk || maxX < 0) return null;
  return { x: minX, y: minY, width: maxX - minX + 1, height: maxY - minY + 1 };
}
