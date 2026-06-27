/**
 * Locate the 9x9 grid in a binarized screenshot and address its cells. The approach
 * is deliberately simple (no contour finding): trim to the ink bounding box — which,
 * for a screenshot cropped to the puzzle, is the grid frame — then divide evenly into
 * 81 cells. Misreads are expected to be fixed in the editor, so robustness beats
 * cleverness here.
 */

import { type Bitmap, type Rect } from './bitmap.ts';

/**
 * The grid's bounding rect: the span of rows/columns whose ink density clears a small
 * fraction of the densest row/column (which drops surrounding margin and faint noise).
 * Falls back to the whole image if nothing stands out.
 */
export function detectGridBounds(b: Bitmap): Rect {
  const rowInk = new Array<number>(b.height).fill(0);
  const colInk = new Array<number>(b.width).fill(0);
  for (let y = 0; y < b.height; y++) {
    const base = y * b.width;
    for (let x = 0; x < b.width; x++) {
      if (b.data[base + x]) {
        rowInk[y]++;
        colInk[x]++;
      }
    }
  }
  const span = (arr: number[], limit: number): [number, number] => {
    let max = 0;
    for (const v of arr) if (v > max) max = v;
    if (max === 0) return [0, limit - 1];
    const thr = max * 0.08;
    let lo = 0;
    let hi = limit - 1;
    while (lo < limit && arr[lo] < thr) lo++;
    while (hi > lo && arr[hi] < thr) hi--;
    return [lo, hi];
  };
  const [x0, x1] = span(colInk, b.width);
  const [y0, y1] = span(rowInk, b.height);
  return { x: x0, y: y0, width: Math.max(1, x1 - x0 + 1), height: Math.max(1, y1 - y0 + 1) };
}

/** The rect of cell (row, col) within an evenly divided grid `bounds`. */
export function cellRect(bounds: Rect, row: number, col: number): Rect {
  const cw = bounds.width / 9;
  const ch = bounds.height / 9;
  return {
    x: Math.round(bounds.x + col * cw),
    y: Math.round(bounds.y + row * ch),
    width: Math.round(cw),
    height: Math.round(ch),
  };
}

/** Inset a rect by `frac` on every side (used to drop grid lines around a cell). */
export function insetRect(r: Rect, frac: number): Rect {
  const dx = Math.round(r.width * frac);
  const dy = Math.round(r.height * frac);
  return {
    x: r.x + dx,
    y: r.y + dy,
    width: Math.max(1, r.width - 2 * dx),
    height: Math.max(1, r.height - 2 * dy),
  };
}
