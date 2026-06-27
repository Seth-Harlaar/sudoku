/**
 * Entry point for screenshot → puzzle parsing. Pure CV, no dependencies: grayscale →
 * Otsu binarize → locate grid → per-cell glyph → template match. Returns 81 digits
 * (null = blank) plus a per-cell confidence, which the review editor surfaces so the
 * user can fix anything the matcher got wrong.
 */

import { binarize, inkBounds, toGrayscale } from './bitmap.ts';
import { cellRect, detectGridBounds, insetRect } from './segment.ts';
import { matchDigit, normalizeGlyph } from './glyphs.ts';
import { buildDigitTemplates } from './templates.ts';

export interface OcrResult {
  /** 81 row-major digits; null = blank cell. */
  digits: (number | null)[];
  /** 81 confidences 0..1 (0 for blanks). */
  confidence: number[];
}

/** Longest side the source is scaled to before processing (perf vs. detail balance). */
const MAX_DIM = 1100;
const SCORE_MIN = 0.55;
const MARGIN_MIN = 0.02;

function loadImage(source: Blob | string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = typeof source === 'string' ? source : URL.createObjectURL(source);
    img.onload = () => {
      if (typeof source !== 'string') URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      if (typeof source !== 'string') URL.revokeObjectURL(url);
      reject(new Error('Could not load image'));
    };
    img.src = url;
  });
}

export async function parseSudokuImage(source: Blob | string): Promise<OcrResult> {
  const img = await loadImage(source);
  const scale = Math.min(1, MAX_DIM / Math.max(img.width, img.height));
  const w = Math.max(1, Math.round(img.width * scale));
  const h = Math.max(1, Math.round(img.height * scale));

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('Canvas not available');
  ctx.drawImage(img, 0, 0, w, h);

  const bin = binarize(toGrayscale(ctx.getImageData(0, 0, w, h).data, w * h), w, h);
  const bounds = detectGridBounds(bin);
  const templates = buildDigitTemplates();

  const digits = new Array<number | null>(81).fill(null);
  const confidence = new Array<number>(81).fill(0);
  const cellArea = (bounds.width / 9) * (bounds.height / 9);
  const minInk = Math.max(6, Math.round(cellArea * 0.008));

  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      const region = insetRect(cellRect(bounds, r, c), 0.14);
      const bb = inkBounds(bin, region, minInk);
      if (!bb) continue;
      const m = matchDigit(normalizeGlyph(bin, bb), templates);
      if (m.score >= SCORE_MIN && m.margin >= MARGIN_MIN) {
        const idx = r * 9 + c;
        digits[idx] = m.digit;
        confidence[idx] = m.score;
      }
    }
  }
  return { digits, confidence };
}
