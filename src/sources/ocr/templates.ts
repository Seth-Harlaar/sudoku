/**
 * Digit templates 1-9, rendered once to a canvas in a clean bold sans-serif and
 * normalized the same way cell glyphs are, so they can be compared directly. Sudoku
 * apps/screenshots overwhelmingly use plain sans fonts, so a single typeface matches
 * well enough; remaining misreads are corrected in the editor.
 */

import { type Bitmap, binarize, inkBounds, makeBitmap, toGrayscale } from './bitmap.ts';
import { GLYPH_SIZE, normalizeGlyph } from './glyphs.ts';

let cached: Bitmap[] | null = null;

export function buildDigitTemplates(): Bitmap[] {
  if (cached) return cached;
  const S = 48;
  const canvas = document.createElement('canvas');
  canvas.width = S;
  canvas.height = S;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  const out: Bitmap[] = [];
  if (!ctx) return out;

  ctx.font = 'bold 40px "Helvetica Neue", Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (let d = 1; d <= 9; d++) {
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, S, S);
    ctx.fillStyle = '#000';
    ctx.fillText(String(d), S / 2, S / 2 + 2);
    const { data } = ctx.getImageData(0, 0, S, S);
    const bin = binarize(toGrayscale(data, S * S), S, S);
    const bb = inkBounds(bin, { x: 0, y: 0, width: S, height: S }, 10);
    out[d] = bb ? normalizeGlyph(bin, bb) : makeBitmap(GLYPH_SIZE, GLYPH_SIZE);
  }
  cached = out;
  return out;
}
