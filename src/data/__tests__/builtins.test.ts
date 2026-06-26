import { describe, expect, it } from 'vitest';
import { BUILTIN_PUZZLES } from '../builtins.ts';
import { parseBoard } from '../../game/grid.ts';
import { isValidSolution } from '../../game/rules.ts';
import { makePuzzleId } from '../../game/puzzle.ts';

describe('builtin puzzles', () => {
  it('exist', () => {
    expect(BUILTIN_PUZZLES.length).toBeGreaterThan(0);
  });

  for (const p of BUILTIN_PUZZLES) {
    describe(p.title ?? p.id, () => {
      it('has a valid 81-cell solution', () => {
        const cells = parseBoard(p.solution!).map((d) => ({
          value: d === 0 ? null : d,
          given: true,
          center: [],
          corner: [],
          color: null,
        }));
        expect(isValidSolution(cells)).toBe(true);
      });

      it('givens are a subset of the solution', () => {
        const g = parseBoard(p.givens);
        const s = parseBoard(p.solution!);
        for (let i = 0; i < 81; i++) {
          if (g[i] !== 0) expect(g[i]).toBe(s[i]);
        }
      });

      it('id matches the hash of its givens', () => {
        expect(p.id).toBe(makePuzzleId(p.givens));
      });
    });
  }
});
