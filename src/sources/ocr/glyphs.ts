/**
 * Pure glyph normalization + template matching. A cell's ink is scaled into a fixed
 * square, then compared against pre-rendered templates for the digits 1-9. Matching
 * combines pixel agreement with ink intersection-over-union so it isn't dominated by
 * the (mostly empty) background.
 */

import { type Bitmap, type Rect, getPx, makeBitmap } from './bitmap.ts';

export const GLYPH_SIZE = 28;
const PAD = 3;

/** Scale the ink in `bbox` into a centered, padded GLYPH_SIZE square (area sampling). */
export function normalizeGlyph(src: Bitmap, bbox: Rect, size = GLYPH_SIZE): Bitmap {
  const out = makeBitmap(size, size);
  const inner = size - 2 * PAD;
  const scale = Math.min(inner / bbox.width, inner / bbox.height);
  const dw = Math.max(1, Math.round(bbox.width * scale));
  const dh = Math.max(1, Math.round(bbox.height * scale));
  const ox = Math.floor((size - dw) / 2);
  const oy = Math.floor((size - dh) / 2);
  const sxScale = bbox.width / dw;
  const syScale = bbox.height / dh;

  for (let dy = 0; dy < dh; dy++) {
    const sy0 = bbox.y + Math.floor(dy * syScale);
    const sy1 = Math.max(sy0 + 1, bbox.y + Math.floor((dy + 1) * syScale));
    for (let dx = 0; dx < dw; dx++) {
      const sx0 = bbox.x + Math.floor(dx * sxScale);
      const sx1 = Math.max(sx0 + 1, bbox.x + Math.floor((dx + 1) * sxScale));
      let ink = 0;
      let area = 0;
      for (let sy = sy0; sy < sy1; sy++) {
        for (let sx = sx0; sx < sx1; sx++) {
          ink += getPx(src, sx, sy);
          area++;
        }
      }
      if (area > 0 && ink / area >= 0.4) out.data[(oy + dy) * size + (ox + dx)] = 1;
    }
  }
  return out;
}

export interface Match {
  digit: number;
  /** Best similarity 0..1. */
  score: number;
  /** Gap to the runner-up; higher = less ambiguous. */
  margin: number;
}

/** Similarity 0..1 between two equal-sized glyphs: blends pixel agreement and ink IoU. */
export function similarity(a: Bitmap, b: Bitmap): number {
  const n = a.data.length;
  let agree = 0;
  let inter = 0;
  let union = 0;
  for (let i = 0; i < n; i++) {
    const pa = a.data[i];
    const pb = b.data[i];
    if (pa === pb) agree++;
    if (pa || pb) {
      union++;
      if (pa && pb) inter++;
    }
  }
  const agreement = agree / n;
  const iou = union === 0 ? 0 : inter / union;
  return 0.5 * agreement + 0.5 * iou;
}

/**
 * Best digit (1-9) for a normalized glyph. `templates[d]` is the template for digit d
 * (index 0 unused). Returns the top match plus its margin over the runner-up.
 */
export function matchDigit(glyph: Bitmap, templates: readonly Bitmap[]): Match {
  let best = -1;
  let bestScore = -1;
  let second = -1;
  for (let d = 1; d <= 9; d++) {
    const t = templates[d];
    if (!t) continue;
    const s = similarity(glyph, t);
    if (s > bestScore) {
      second = bestScore;
      bestScore = s;
      best = d;
    } else if (s > second) {
      second = s;
    }
  }
  return { digit: best, score: bestScore, margin: bestScore - (second < 0 ? 0 : second) };
}
