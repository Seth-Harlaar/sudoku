import { describe, expect, it } from 'vitest';
import { parseRadcliffeCsv } from '../csv.ts';
import { makePuzzleId } from '../../game/puzzle.ts';
import { GIVENS, SOLUTION } from '../../game/__tests__/fixtures.ts';

describe('parseRadcliffeCsv', () => {
  it('parses the dataset schema (id,puzzle,...) using the original id', () => {
    const csv = [
      'id,puzzle,solution,clues,difficulty',
      `646979,${GIVENS},${SOLUTION},30,2.7`,
    ].join('\n');
    const { puzzles, skipped } = parseRadcliffeCsv(csv);
    expect(puzzles).toHaveLength(1);
    expect(skipped).toBe(1); // the header row
    const p = puzzles[0];
    expect(p.id).toBe('646979'); // dataset id, not a hash
    expect(p.solution).toBe(SOLUTION);
    expect(p.clues).toBe(30);
    expect(p.rating).toBe(2.7);
    expect(p.difficulty).toBe('medium');
    expect(p.source).toBe('local');
  });

  it('falls back to a hashed id for the id-less schema', () => {
    const csv = [
      'puzzle,solution,clues,difficulty',
      `${GIVENS},${SOLUTION},30,2.7`,
    ].join('\n');
    const { puzzles, skipped } = parseRadcliffeCsv(csv);
    expect(puzzles).toHaveLength(1);
    expect(skipped).toBe(1); // the header row
    expect(puzzles[0].id).toBe(makePuzzleId(GIVENS));
  });

  it('de-dupes repeated puzzles within the file', () => {
    const row = `42,${GIVENS},${SOLUTION},30,2.7`;
    const { puzzles } = parseRadcliffeCsv([row, row].join('\n'));
    expect(puzzles).toHaveLength(1);
  });

  it('normalizes 0-blanks to . and counts clues when missing', () => {
    const zeros = GIVENS.replace(/\./g, '0');
    const { puzzles } = parseRadcliffeCsv(zeros); // no solution/clues columns
    expect(puzzles).toHaveLength(1);
    expect(puzzles[0].givens).toBe(GIVENS);
    expect(puzzles[0].id).toBe(makePuzzleId(GIVENS));
    expect(puzzles[0].clues).toBe(GIVENS.replace(/\./g, '').length);
    expect(puzzles[0].solution).toBeUndefined();
  });

  it('skips malformed rows', () => {
    const csv = ['not,a,valid,row', '123', `${GIVENS},${SOLUTION},30,2.7`].join('\n');
    const { puzzles, skipped } = parseRadcliffeCsv(csv);
    expect(puzzles).toHaveLength(1);
    expect(skipped).toBe(2);
  });
});
