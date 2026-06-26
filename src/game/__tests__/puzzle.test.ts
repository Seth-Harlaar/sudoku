import { describe, expect, it } from 'vitest';
import { bucketDifficulty, makePuzzleId } from '../puzzle.ts';
import { GIVENS } from './fixtures.ts';

describe('makePuzzleId', () => {
  it('is stable for the same givens', () => {
    expect(makePuzzleId(GIVENS)).toBe(makePuzzleId(GIVENS));
  });

  it('differs for different givens', () => {
    expect(makePuzzleId(GIVENS)).not.toBe(makePuzzleId('.' + GIVENS.slice(1)));
  });

  it('produces an 8-char hex string', () => {
    expect(makePuzzleId(GIVENS)).toMatch(/^[0-9a-f]{8}$/);
  });
});

describe('bucketDifficulty', () => {
  it('maps ratings into labels', () => {
    expect(bucketDifficulty(0.5)).toBe('easy');
    expect(bucketDifficulty(3)).toBe('medium');
    expect(bucketDifficulty(5.5)).toBe('hard');
    expect(bucketDifficulty(8)).toBe('expert');
  });

  it('returns undefined for missing/NaN ratings', () => {
    expect(bucketDifficulty(undefined)).toBeUndefined();
    expect(bucketDifficulty(NaN)).toBeUndefined();
  });
});
