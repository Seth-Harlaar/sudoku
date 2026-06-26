/**
 * Parser for the Radcliffe "3M Sudoku puzzles with ratings" CSV (and compatible
 * exports). Columns: `puzzle,solution,clues,difficulty`. `puzzle` is 81 chars with
 * '.'/'0' for blanks; `solution` is 81 digits; `clues` is an int; `difficulty` is a
 * numeric rating. A header row, blank lines, and malformed rows are skipped.
 */

import type { Puzzle } from '../game/types.ts';
import { parseBoard, serializeBoard } from '../game/grid.ts';
import { bucketDifficulty, makePuzzleId } from '../game/puzzle.ts';

export interface CsvParseResult {
  puzzles: Puzzle[];
  /** Rows that couldn't be parsed (excluding a header row and blank lines). */
  skipped: number;
}

/** Normalize an 81-cell field to a canonical givens string ('.' blanks), or throw. */
function normalizeBoard(field: string): string {
  return serializeBoard(parseBoard(field));
}

function rowToPuzzle(cols: string[], addedAt: number): Puzzle {
  const givens = normalizeBoard(cols[0] ?? '');

  const puzzle: Puzzle = {
    id: makePuzzleId(givens),
    givens,
    source: 'local',
    addedAt,
  };

  const solutionField = cols[1]?.trim();
  if (solutionField) {
    const solution = normalizeBoard(solutionField);
    if (solution.includes('.')) throw new Error('solution has blanks');
    puzzle.solution = solution;
  }

  const cluesField = cols[2]?.trim();
  const clues = cluesField ? Number(cluesField) : NaN;
  puzzle.clues = Number.isFinite(clues)
    ? clues
    : givens.replace(/\./g, '').length;

  const ratingField = cols[3]?.trim();
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
