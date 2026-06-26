import { describe, expect, it } from 'vitest';
import { selectionLoops } from '../selectionPath.ts';

/** Count distinct lattice points referenced in a path's M/L commands. */
function pointCount(d: string): number {
  return (d.match(/[ML]/g) ?? []).length;
}

describe('selectionLoops', () => {
  it('returns nothing for an empty selection', () => {
    expect(selectionLoops([])).toEqual([]);
  });

  it('traces a single cell as one 4-corner loop', () => {
    const loops = selectionLoops([40]); // center cell
    expect(loops).toHaveLength(1);
    expect(loops[0].endsWith('Z')).toBe(true);
    expect(pointCount(loops[0])).toBe(4);
  });

  it('merges a contiguous row into a single loop', () => {
    // Three cells in a row -> one rectangle (4 corners after collinear points,
    // but our tracer keeps per-edge vertices: still one closed loop).
    const loops = selectionLoops([9, 10, 11]);
    expect(loops).toHaveLength(1);
    expect(loops[0].endsWith('Z')).toBe(true);
  });

  it('keeps diagonal (corner-touching) cells as separate loops', () => {
    const loops = selectionLoops([0, 10]); // (0,0) and (1,1) touch only at a corner
    expect(loops).toHaveLength(2);
  });

  it('traces an L-shape as a single loop with a concave corner', () => {
    // cells (0,0),(1,0),(1,1) -> an L, one connected region
    const loops = selectionLoops([0, 9, 10]);
    expect(loops).toHaveLength(1);
    // L-shape boundary has 6 corners.
    expect(pointCount(loops[0])).toBe(6);
  });
});
