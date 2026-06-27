import { describe, expect, it } from 'vitest';
import {
  binarize,
  inkBounds,
  makeBitmap,
  otsuThreshold,
  toGrayscale,
  type Bitmap,
} from '../bitmap.ts';
import { cellRect, detectGridBounds, insetRect } from '../segment.ts';
import { GLYPH_SIZE, matchDigit, normalizeGlyph, similarity } from '../glyphs.ts';

function fromRows(rows: string[]): Bitmap {
  const height = rows.length;
  const width = rows[0].length;
  const b = makeBitmap(width, height);
  rows.forEach((r, y) => {
    for (let x = 0; x < width; x++) if (r[x] === '#') b.data[y * width + x] = 1;
  });
  return b;
}

/** A GLYPH_SIZE template with a solid vertical bar in column band [c0, c1). */
function vBar(c0: number, c1: number): Bitmap {
  const b = makeBitmap(GLYPH_SIZE, GLYPH_SIZE);
  for (let y = 4; y < GLYPH_SIZE - 4; y++)
    for (let x = c0; x < c1; x++) b.data[y * GLYPH_SIZE + x] = 1;
  return b;
}

describe('otsuThreshold', () => {
  it('splits a clearly bimodal histogram between the two modes', () => {
    const gray = new Uint8Array(200);
    gray.fill(30, 0, 100);
    gray.fill(200, 100, 200);
    const t = otsuThreshold(gray);
    expect(t).toBeGreaterThanOrEqual(30);
    expect(t).toBeLessThan(200);
  });
});

describe('toGrayscale', () => {
  it('maps white to ~255 and black to 0', () => {
    const rgba = new Uint8ClampedArray([255, 255, 255, 255, 0, 0, 0, 255]);
    const g = toGrayscale(rgba, 2);
    expect(g[0]).toBeGreaterThan(250);
    expect(g[1]).toBe(0);
  });
});

describe('binarize', () => {
  it('treats the minority class as ink (works for light & dark themes)', () => {
    // Mostly bright background with a small dark blob => the blob is ink.
    const w = 10;
    const h = 10;
    const gray = new Uint8Array(w * h).fill(240);
    for (const i of [22, 23, 32, 33]) gray[i] = 10;
    const bin = binarize(gray, w, h);
    for (const i of [22, 23, 32, 33]) expect(bin.data[i]).toBe(1);
    expect(bin.data[0]).toBe(0);
  });
});

describe('inkBounds', () => {
  it('returns the tight box around ink, or null below the ink floor', () => {
    const b = fromRows([
      '..........',
      '..####....',
      '..####....',
      '..........',
    ]);
    const full = { x: 0, y: 0, width: 10, height: 4 };
    expect(inkBounds(b, full, 2)).toEqual({ x: 2, y: 1, width: 4, height: 2 });
    expect(inkBounds(b, full, 100)).toBeNull();
  });
});

describe('detectGridBounds', () => {
  it('trims surrounding margin to the dense block', () => {
    const b = makeBitmap(20, 20);
    for (let y = 5; y <= 14; y++)
      for (let x = 5; x <= 14; x++) b.data[y * 20 + x] = 1;
    const r = detectGridBounds(b);
    expect(r.x).toBe(5);
    expect(r.y).toBe(5);
    expect(r.width).toBe(10);
    expect(r.height).toBe(10);
  });
});

describe('cellRect / insetRect', () => {
  it('divides bounds into 9 and insets symmetrically', () => {
    const bounds = { x: 0, y: 0, width: 90, height: 90 };
    expect(cellRect(bounds, 0, 0)).toEqual({ x: 0, y: 0, width: 10, height: 10 });
    expect(cellRect(bounds, 8, 8)).toEqual({ x: 80, y: 80, width: 10, height: 10 });
    expect(insetRect({ x: 0, y: 0, width: 10, height: 10 }, 0.1)).toEqual({
      x: 1,
      y: 1,
      width: 8,
      height: 8,
    });
  });
});

describe('glyph matching', () => {
  it('similarity is 1 for identical glyphs', () => {
    const a = vBar(12, 16);
    expect(similarity(a, a)).toBeCloseTo(1, 5);
  });

  it('matchDigit picks the closest template', () => {
    const templates: Bitmap[] = [];
    templates[1] = vBar(2, 6); // left bar
    templates[2] = vBar(11, 15); // middle bar
    templates[3] = vBar(20, 24); // right bar
    const glyphLikeTwo = vBar(11, 15);
    const m = matchDigit(glyphLikeTwo, templates);
    expect(m.digit).toBe(2);
    expect(m.score).toBeGreaterThan(0.9);
    expect(m.margin).toBeGreaterThan(0);
  });

  it('normalizeGlyph centers ink into the padded square', () => {
    // A small ink block in the corner should be scaled & centered.
    const src = fromRows([
      '########..',
      '########..',
      '########..',
      '########..',
      '..........',
      '..........',
    ]);
    const g = normalizeGlyph(src, { x: 0, y: 0, width: 8, height: 4 });
    let minX = GLYPH_SIZE;
    let maxX = -1;
    for (let y = 0; y < GLYPH_SIZE; y++)
      for (let x = 0; x < GLYPH_SIZE; x++)
        if (g.data[y * GLYPH_SIZE + x]) {
          minX = Math.min(minX, x);
          maxX = Math.max(maxX, x);
        }
    expect(maxX).toBeGreaterThan(minX); // has ink
    // roughly centered: left and right padding within a few px of each other
    expect(Math.abs(minX - (GLYPH_SIZE - 1 - maxX))).toBeLessThanOrEqual(3);
  });
});
