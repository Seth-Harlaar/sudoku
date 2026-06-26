import { describe, expect, it } from 'vitest';
import type { Cell } from '../../game/types.ts';
import { CELL_COUNT, PEERS, indexOf } from '../../game/grid.ts';
import { peekHighlights } from '../selectors.ts';

function emptyCells(): Cell[] {
  return Array.from({ length: CELL_COUNT }, () => ({
    value: null,
    given: false,
    center: [],
    corner: [],
    color: null,
  }));
}

describe('peekHighlights', () => {
  it('marks a single occurrence and its 20 peers as eliminated', () => {
    const cells = emptyCells();
    const at = indexOf(3, 4);
    cells[at].value = 9;
    const { same, elim } = peekHighlights(cells, 9);
    expect([...same]).toEqual([at]);
    expect(elim.size).toBe(20);
    expect(elim.has(at)).toBe(false);
    // every peer of the occurrence is eliminated (whole row/col/box)
    for (const p of PEERS[at]) expect(elim.has(p)).toBe(true);
  });

  it('unions eliminations across multiple occurrences, excluding the occurrences', () => {
    const cells = emptyCells();
    const a = indexOf(0, 0);
    const b = indexOf(0, 5); // same row as a
    cells[a].value = 5;
    cells[b].value = 5;
    const { same, elim } = peekHighlights(cells, 5);
    expect(same).toEqual(new Set([a, b]));
    expect(elim.has(a)).toBe(false);
    expect(elim.has(b)).toBe(false);
    // a cell that is a peer of either occurrence is eliminated
    expect(elim.has(indexOf(0, 3))).toBe(true); // shares row 0
  });

  it('returns empty sets when the digit is absent', () => {
    const { same, elim } = peekHighlights(emptyCells(), 7);
    expect(same.size).toBe(0);
    expect(elim.size).toBe(0);
  });
});
