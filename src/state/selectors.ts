import type { Cell, Puzzle } from '../game/types.ts';
import { PEERS } from '../game/grid.ts';
import { findConflicts, findMistakes } from '../game/rules.ts';

export interface Highlights {
  selected: Set<number>;
  /** Cells in conflict (duplicate placed digit in a row/col/box). */
  conflicts: Set<number>;
  /** Cells whose placed digit equals a digit in the current selection. */
  sameDigit: Set<number>;
  /** Cells that contradict the known solution (only when `showMistakes`). */
  mistakes: Set<number>;
  /** The single highlighted digit, when exactly one is active (for the numpad). */
  activeDigit: number | null;
}

export interface HighlightOptions {
  showConflicts: boolean;
  showMistakes: boolean;
}

/** Derive all visual-highlight sets for the board in one pass. */
export function deriveHighlights(
  cells: readonly Cell[],
  selection: readonly number[],
  puzzle: Puzzle | null,
  opts: HighlightOptions,
): Highlights {
  const selected = new Set(selection);

  // Same-digit highlight only applies when a single cell is selected; with a
  // multi-cell selection we suppress it to keep the board readable.
  const activeDigit =
    selection.length === 1 ? (cells[selection[0]].value ?? null) : null;

  const sameDigit = new Set<number>();
  if (activeDigit != null) {
    for (let i = 0; i < cells.length; i++) {
      if (cells[i].value === activeDigit) sameDigit.add(i);
    }
  }

  return {
    selected,
    conflicts: opts.showConflicts ? findConflicts(cells) : new Set(),
    sameDigit,
    mistakes: opts.showMistakes && puzzle ? findMistakes(cells, puzzle) : new Set(),
    activeDigit,
  };
}

export interface PeekHighlights {
  /** Cells holding the peeked digit. */
  same: Set<number>;
  /** Cells those occurrences eliminate from being the digit (their peers). */
  elim: Set<number>;
}

/**
 * For a long-pressed digit, the cells holding it (`same`) and the cells those
 * occurrences rule out (`elim` = union of their peers, minus the occurrences).
 */
export function peekHighlights(
  cells: readonly Cell[],
  digit: number,
): PeekHighlights {
  const same = new Set<number>();
  for (let i = 0; i < cells.length; i++) {
    if (cells[i].value === digit) same.add(i);
  }
  const elim = new Set<number>();
  for (const i of same) {
    for (const p of PEERS[i]) if (!same.has(p)) elim.add(p);
  }
  return { same, elim };
}

/**
 * Per-cell bitmask (bits 1-9) of digits already placed in that cell's peers — i.e.
 * the digits that can't legally go there. Used to flag pencil marks that are no
 * longer possible. Filled cells get 0 (their marks aren't shown anyway).
 */
export function peerDigitMasks(cells: readonly Cell[]): number[] {
  const masks = new Array<number>(cells.length).fill(0);
  for (let i = 0; i < cells.length; i++) {
    if (cells[i].value != null) continue;
    let mask = 0;
    for (const p of PEERS[i]) {
      const v = cells[p].value;
      if (v != null) mask |= 1 << v;
    }
    masks[i] = mask;
  }
  return masks;
}

/** Count remaining placements for each digit 1-9 (for numpad completion hints). */
export function digitCounts(cells: readonly Cell[]): number[] {
  const counts = new Array(10).fill(0) as number[];
  for (const c of cells) if (c.value != null) counts[c.value]++;
  return counts;
}
