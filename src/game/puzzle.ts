/** Pure helpers for deriving puzzle ids and difficulty buckets. */

import type { Difficulty } from './types.ts';

/**
 * Stable, dependency-free id derived from the givens string (FNV-1a, 32-bit, hex).
 * Same givens -> same id, which gives us free dedupe on re-import.
 */
export function makePuzzleId(givens: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < givens.length; i++) {
    h ^= givens.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, '0');
}

/**
 * Bucket the dataset's continuous rating into a label for filtering. Thresholds are
 * first-pass and will be tuned against a real sample of the Radcliffe data.
 */
export function bucketDifficulty(rating: number | undefined): Difficulty | undefined {
  if (rating == null || Number.isNaN(rating)) return undefined;
  if (rating < 2) return 'easy';
  if (rating < 4) return 'medium';
  if (rating < 6) return 'hard';
  return 'expert';
}
