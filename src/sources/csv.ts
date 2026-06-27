/**
 * Parser for the Radcliffe "3M Sudoku puzzles with ratings" CSV (and compatible
 * exports). Canonical columns: `id,puzzle,solution,clues,difficulty`. `id` is the
 * dataset's own integer id and becomes the Puzzle id (no hashing); `puzzle` is 81
 * chars with '.'/'0' for blanks; `solution` is 81 digits; `clues` is an int;
 * `difficulty` is a numeric rating. The leading `id` column is auto-detected, so an
 * id-less `puzzle,solution,...` export still parses (id is then hashed from givens).
 * A header row, blank lines, and malformed rows are skipped.
 */

import type { Puzzle } from '../game/types.ts';
import { parseBoard, serializeBoard } from '../game/grid.ts';
import { bucketDifficulty, makePuzzleId } from '../game/puzzle.ts';

export interface CsvParseResult {
  puzzles: Puzzle[];
  /** Rows that couldn't be parsed (excluding a header row and blank lines). */
  skipped: number;
}

/** An 81-char board field (digits, '.', or '0' blanks) — used to locate the puzzle column. */
const BOARD_RE = /^[0-9.]{81}$/;

/** Normalize an 81-cell field to a canonical givens string ('.' blanks), or throw. */
function normalizeBoard(field: string): string {
  return serializeBoard(parseBoard(field));
}

function rowToPuzzle(cols: string[], addedAt: number): Puzzle {
  // Auto-detect an optional leading dataset id: if col 0 isn't an 81-char board,
  // treat it as the id and read the puzzle from col 1 (id,puzzle,solution,...).
  const hasId = !BOARD_RE.test((cols[0] ?? '').trim());
  const i = hasId ? 1 : 0;
  const datasetId = hasId ? cols[0]?.trim() : undefined;

  const givens = normalizeBoard(cols[i] ?? '');

  const puzzle: Puzzle = {
    // Prefer the dataset's own id; fall back to a hash of the givens when absent.
    id: datasetId || makePuzzleId(givens),
    givens,
    source: 'local',
    addedAt,
  };

  const solutionField = cols[i + 1]?.trim();
  if (solutionField) {
    const solution = normalizeBoard(solutionField);
    if (solution.includes('.')) throw new Error('solution has blanks');
    puzzle.solution = solution;
  }

  const cluesField = cols[i + 2]?.trim();
  const clues = cluesField ? Number(cluesField) : NaN;
  puzzle.clues = Number.isFinite(clues)
    ? clues
    : givens.replace(/\./g, '').length;

  const ratingField = cols[i + 3]?.trim();
  const rating = ratingField ? Number(ratingField) : NaN;
  if (Number.isFinite(rating)) {
    puzzle.rating = rating;
    const difficulty = bucketDifficulty(rating);
    if (difficulty) puzzle.difficulty = difficulty;
  }

  return puzzle;
}

export function parseRadcliffeCsv(text: string, now = Date.now()): CsvParseResult {
  const puzzles: Puzzle[] = [];
  const seen = new Set<string>();
  let skipped = 0;

  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    const cols = line.split(',');
    try {
      const puzzle = rowToPuzzle(cols, now);
      if (seen.has(puzzle.id)) continue; // de-dupe within the file
      seen.add(puzzle.id);
      puzzles.push(puzzle);
    } catch {
      skipped++; // header row or malformed line
    }
  }

  return { puzzles, skipped };
}
