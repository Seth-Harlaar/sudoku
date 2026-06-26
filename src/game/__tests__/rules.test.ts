import { describe, expect, it } from 'vitest';
import type { Cell } from '../types.ts';
import { parseBoard } from '../grid.ts';
import {
  candidates,
  findConflicts,
  findMistakes,
  isFilled,
  isSolved,
  isValidSolution,
} from '../rules.ts';
import { CLASSIC, GIVENS, SOLUTION } from './fixtures.ts';

/** Build a cells array from an 81-char digit string (no marks/colors). */
function cellsFrom(board: string): Cell[] {
  return parseBoard(board).map((d) => ({
    value: d === 0 ? null : d,
    given: d !== 0,
    center: [],
    corner: [],
    color: null,
  }));
}

describe('conflicts', () => {
  it('finds none in a valid solution', () => {
    expect(findConflicts(cellsFrom(SOLUTION)).size).toBe(0);
  });

  it('flags a duplicate in a row', () => {
    const cells = cellsFrom(GIVENS);
    // Row 0 already has a 5 and 3; place another 5 in an empty row-0 cell (index 2).
    cells[2].value = 5;
    const conflicts = findConflicts(cells);
    expect(conflicts.has(2)).toBe(true);
    expect(conflicts.has(0)).toBe(true); // the original 5 at (0,0)
  });
});

describe('completeness & validity', () => {
  it('isFilled distinguishes complete boards', () => {
    expect(isFilled(cellsFrom(SOLUTION))).toBe(true);
    expect(isFilled(cellsFrom(GIVENS))).toBe(false);
  });

  it('isValidSolution accepts the solution and rejects a broken fill', () => {
    expect(isValidSolution(cellsFrom(SOLUTION))).toBe(true);
    const broken = cellsFrom(SOLUTION);
    broken[0].value = broken[1].value; // duplicate in row 0
    expect(isValidSolution(broken)).toBe(false);
  });
});

describe('isSolved', () => {
  it('requires an exact match when a solution is provided', () => {
    expect(isSolved(cellsFrom(SOLUTION), CLASSIC)).toBe(true);

    // A different but rule-valid full grid should NOT count when solution is known.
    const shuffled = cellsFrom(SOLUTION);
    // Swap two columns to make a valid-but-different grid via simple transform:
    // swapping digits 1<->2 everywhere keeps it valid but differs from SOLUTION.
    for (const c of shuffled) {
      if (c.value === 1) c.value = 2;
      else if (c.value === 2) c.value = 1;
    }
    expect(isValidSolution(shuffled)).toBe(true);
    expect(isSolved(shuffled, CLASSIC)).toBe(false);
  });

  it('falls back to rule validity without a solution', () => {
    const noSol = { id: 'x', givens: GIVENS, source: 'builtin', addedAt: 0 } as const;
    expect(isSolved(cellsFrom(SOLUTION), noSol)).toBe(true);
  });
});

describe('mistakes & candidates', () => {
  it('findMistakes flags wrong placements against the solution', () => {
    const cells = cellsFrom(GIVENS);
    cells[2].value = 9; // (0,2) should be 4 in the solution
    const mistakes = findMistakes(cells, CLASSIC);
    expect(mistakes.has(2)).toBe(true);
  });

  it('candidates exclude peer digits', () => {
    const cells = cellsFrom(GIVENS);
    // (0,2) is empty; row 0 has 5,3,7; check the candidate set is sane.
    const cand = candidates(cells, 2);
    expect(cand).not.toContain(5);
    expect(cand).not.toContain(3);
    expect(cand).toContain(4); // the true solution digit must be a candidate
  });
});
