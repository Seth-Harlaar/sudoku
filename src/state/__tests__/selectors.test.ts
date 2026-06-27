import { describe, expect, it } from 'vitest';
import type { Cell } from '../../game/types.ts';
import { CELL_COUNT, PEERS, indexOf } from '../../game/grid.ts';
import { peekHighlights, peerDigitMasks } from '../selectors.ts';

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

describe('peerDigitMasks', () => {
  it('flags digits placed in a cell peers and ignores filled cells', () => {
    const cells = emptyCells();
    const target = indexOf(4, 4);
    cells[indexOf(4, 0)].value = 3; // same row
    cells[indexOf(0, 4)].value = 7; // same column
    const masks = peerDigitMasks(cells);

    expect(masks[target] & (1 << 3)).not.toBe(0); // 3 impossible
    expect(masks[target] & (1 << 7)).not.toBe(0); // 7 impossible
    expect(masks[target] & (1 << 5)).toBe(0); // 5 still possible
    // A filled cell reports no mark conflicts (its marks aren't shown).
    expect(masks[indexOf(4, 0)]).toBe(0);
  });
});
