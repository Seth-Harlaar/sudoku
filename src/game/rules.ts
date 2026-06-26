/** Pure Sudoku rule checks: conflicts, completeness, candidates, win detection. */

import type { Cell, Puzzle } from './types.ts';
import { CELL_COUNT, PEERS, UNITS, parseBoard } from './grid.ts';

/**
 * Indices of cells whose placed digit duplicates another placed digit within a
 * shared row, column, or box. Empty cells and pencil marks are ignored.
 */
export function findConflicts(cells: readonly Cell[]): Set<number> {
  const conflicts = new Set<number>();
  for (let i = 0; i < CELL_COUNT; i++) {
    const v = cells[i].value;
    if (v == null) continue;
    for (const p of PEERS[i]) {
      if (cells[p].value === v) {
        conflicts.add(i);
        break;
      }
    }
  }
  return conflicts;
}

/** True when every cell holds a digit. */
export function isFilled(cells: readonly Cell[]): boolean {
  return cells.every((c) => c.value != null);
}

/** True when the board is fully filled and every unit holds 1-9 exactly once. */
export function isValidSolution(cells: readonly Cell[]): boolean {
  if (!isFilled(cells)) return false;
  for (const unit of UNITS) {
    const seen = new Set<number>();
    for (const i of unit) {
      const v = cells[i].value;
      if (v == null || seen.has(v)) return false;
      seen.add(v);
    }
  }
  return true;
}

/**
 * Whether the board is solved. If the puzzle carries a `solution`, the board must
 * match it exactly; otherwise we fall back to rule validity (any valid completion).
 */
export function isSolved(cells: readonly Cell[], puzzle: Puzzle): boolean {
  if (puzzle.solution) {
    const sol = parseBoard(puzzle.solution);
    for (let i = 0; i < CELL_COUNT; i++) {
      if (cells[i].value !== (sol[i] === 0 ? null : sol[i])) return false;
    }
    return true;
  }
  return isValidSolution(cells);
}

/**
 * Cells that contradict the known solution (placed but wrong). Returns an empty set
 * when the puzzle has no solution to check against.
 */
export function findMistakes(cells: readonly Cell[], puzzle: Puzzle): Set<number> {
  const mistakes = new Set<number>();
  if (!puzzle.solution) return mistakes;
  const sol = parseBoard(puzzle.solution);
  for (let i = 0; i < CELL_COUNT; i++) {
    const v = cells[i].value;
    if (v != null && v !== sol[i]) mistakes.add(i);
  }
  return mistakes;
}

/** Candidate digits (1-9) legal in cell `i` given current placements. */
export function candidates(cells: readonly Cell[], i: number): number[] {
  if (cells[i].value != null) return [];
  const used = new Set<number>();
  for (const p of PEERS[i]) {
    const v = cells[p].value;
    if (v != null) used.add(v);
  }
  const out: number[] = [];
  for (let d = 1; d <= 9; d++) if (!used.has(d)) out.push(d);
  return out;
}
