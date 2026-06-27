/**
 * The pure game engine: `apply(state, action, puzzle?) -> state`. No I/O, no React,
 * no clock of its own — the host advances time via `tick`. The puzzle is passed as
 * context (not stored on the serializable state) so solved-detection can use the
 * exact solution; without it we fall back to rule validity. Undo/redo snapshots the
 * `cells` layer only (selection/mode/timer are not undoable).
 */

import type { Action, Cell, GameState, Mode, Puzzle } from './types.ts';
import { CELL_COUNT, SIZE, clamp, indexOf, parseBoard } from './grid.ts';
import { findConflicts, isSolved } from './rules.ts';

/** Max undo depth retained (keeps persisted state bounded). */
export const MAX_HISTORY = 300;

const MODES_WITH_DIGITS: ReadonlySet<Mode> = new Set<Mode>([
  'normal',
  'corner',
  'center',
  'color',
]);

/** Build the initial game state for a puzzle. */
export function createGame(puzzle: Puzzle): GameState {
  const givens = parseBoard(puzzle.givens);
  const cells: Cell[] = givens.map((d) => ({
    value: d === 0 ? null : d,
    given: d !== 0,
    center: [],
    corner: [],
    color: null,
  }));
  return {
    puzzleId: puzzle.id,
    cells,
    selection: [],
    mode: 'normal',
    elapsedMs: 0,
    status: 'new',
    updatedAt: Date.now(),
    past: [],
    future: [],
  };
}

const cloneCell = (c: Cell): Cell => ({
  value: c.value,
  given: c.given,
  center: [...c.center],
  corner: [...c.corner],
  color: c.color,
});

const cloneCells = (cells: readonly Cell[]): Cell[] => cells.map(cloneCell);

/** Solved check; falls back to a filled, conflict-free board when no puzzle is bound. */
function checkSolved(cells: readonly Cell[], puzzle: Puzzle | undefined): boolean {
  if (puzzle) return isSolved(cells, puzzle);
  return cells.every((c) => c.value != null) && findConflicts(cells).size === 0;
}

/**
 * Apply an `input` digit (1-9) to the selection in `mode`.
 * Returns the next cells, or the same reference when nothing changes.
 */
function applyInput(state: GameState, digit: number, mode: Mode): Cell[] {
  // Color applies to ANY selected cell (clues included) — it's a highlight, not a
  // value — and toggles off when every selected cell already has that color.
  if (mode === 'color') {
    const targets = state.selection;
    if (targets.length === 0) return state.cells;
    const colorIdx = digit - 1; // palette index 0-8
    const allSame = targets.every((i) => state.cells[i].color === colorIdx);
    const next = cloneCells(state.cells);
    for (const i of targets) next[i].color = allSame ? null : colorIdx;
    return next;
  }

  // Digits and pencil marks never touch given cells.
  const editable = state.selection.filter((i) => !state.cells[i].given);
  if (editable.length === 0) return state.cells;

  const next = cloneCells(state.cells);

  if (mode === 'normal') {
    // Toggle: if every editable cell already shows this digit, clear it instead.
    const placing = !editable.every((i) => state.cells[i].value === digit);
    for (const i of editable) {
      next[i].value = placing ? digit : null;
      if (placing) {
        next[i].center = [];
        next[i].corner = [];
      }
    }
    return next;
  }

  // corner / center pencil marks — only on cells without a placed value.
  const key = mode === 'corner' ? 'corner' : 'center';
  const markable = editable.filter((i) => state.cells[i].value == null);
  if (markable.length === 0) return state.cells;
  // If every markable cell already has the mark, remove it; otherwise add to all.
  const allHave = markable.every((i) => state.cells[i][key].includes(digit));
  for (const i of markable) {
    const cur = next[i][key];
    if (allHave) {
      next[i][key] = cur.filter((d) => d !== digit);
    } else if (!cur.includes(digit)) {
      next[i][key] = [...cur, digit].sort((a, b) => a - b);
    }
  }
  return next;
}

/** What a single erase removes, in fall-through priority. */
type ClearType = 'value' | 'corner' | 'center' | 'color';

/** Canonical order used to fill in the types after the current mode's own. */
const CLEAR_ORDER: readonly ClearType[] = ['value', 'corner', 'center', 'color'];

/** The erase type that matches the active input mode. */
function clearTypeForMode(mode: Mode): ClearType {
  switch (mode) {
    case 'corner':
      return 'corner';
    case 'center':
      return 'center';
    case 'color':
      return 'color';
    default:
      return 'value';
  }
}

/** Does any selected cell hold erasable content of this type? (givens keep value/marks.) */
function selectionHasType(state: GameState, type: ClearType): boolean {
  return state.selection.some((i) => {
    const c = state.cells[i];
    switch (type) {
      case 'value':
        return !c.given && c.value != null;
      case 'corner':
        return !c.given && c.corner.length > 0;
      case 'center':
        return !c.given && c.center.length > 0;
      case 'color':
        return c.color != null; // color sits on any cell, clues included
    }
  });
}

/** Remove one type of content from every selected cell. */
function clearType(state: GameState, type: ClearType): Cell[] {
  const next = cloneCells(state.cells);
  for (const i of state.selection) {
    const c = next[i];
    if (type === 'color') c.color = null;
    else if (!c.given) {
      if (type === 'value') c.value = null;
      else if (type === 'corner') c.corner = [];
      else c.center = [];
    }
  }
  return next;
}

/**
 * Erase selected cells one layer at a time. Start with the active mode's own type
 * (value/corner/center/color); if the selection has none of that type, fall through
 * to the remaining types in canonical order. So in center mode the first erase drops
 * center marks, the next drops the value, then corner marks, then color.
 */
function applyClear(state: GameState): Cell[] {
  if (state.selection.length === 0) return state.cells;
  const primary = clearTypeForMode(state.mode);
  const order = [primary, ...CLEAR_ORDER.filter((t) => t !== primary)];
  for (const type of order) {
    if (selectionHasType(state, type)) return clearType(state, type);
  }
  return state.cells; // nothing erasable in the selection
}

/** Push current cells onto the undo stack and commit a new cells layer. */
function commit(
  state: GameState,
  nextCells: Cell[],
  puzzle: Puzzle | undefined,
): GameState {
  if (nextCells === state.cells) return state; // no-op
  const past = [...state.past, cloneCells(state.cells)];
  if (past.length > MAX_HISTORY) past.shift();
  return {
    ...state,
    cells: nextCells,
    past,
    future: [],
    status: checkSolved(nextCells, puzzle) ? 'solved' : 'in-progress',
    updatedAt: Date.now(),
  };
}

export function apply(
  state: GameState,
  action: Action,
  puzzle?: Puzzle,
): GameState {
  switch (action.type) {
    case 'select': {
      const cells = action.cells.filter((i) => i >= 0 && i < CELL_COUNT);
      const selection = action.additive
        ? [...new Set([...state.selection, ...cells])]
        : cells;
      return { ...state, selection };
    }
    case 'selectAll':
      return { ...state, selection: Array.from({ length: CELL_COUNT }, (_, i) => i) };
    case 'clearSelection':
      return state.selection.length === 0 ? state : { ...state, selection: [] };
    case 'move': {
      const anchor = state.selection.at(-1) ?? 0;
      const row = clamp(Math.floor(anchor / SIZE) + action.dRow, 0, SIZE - 1);
      const col = clamp((anchor % SIZE) + action.dCol, 0, SIZE - 1);
      const target = indexOf(row, col);
      const selection = action.extend
        ? [...new Set([...state.selection, target])]
        : [target];
      return { ...state, selection };
    }
    case 'setMode':
      return state.mode === action.mode ? state : { ...state, mode: action.mode };
    case 'input': {
      const mode = action.mode ?? state.mode;
      if (!MODES_WITH_DIGITS.has(mode)) return state;
      if (action.digit < 1 || action.digit > 9) return state;
      return commit(state, applyInput(state, action.digit, mode), puzzle);
    }
    case 'clear':
      return commit(state, applyClear(state), puzzle);
    case 'restart': {
      if (state.status === 'new' && state.past.length === 0) return state;
      const cells = state.cells.map((c) =>
        c.given
          ? cloneCell(c)
          : { value: null, given: false, center: [], corner: [], color: null },
      );
      return {
        ...state,
        cells,
        selection: [],
        past: [],
        future: [],
        status: 'new',
        updatedAt: Date.now(),
      };
    }
    case 'undo': {
      if (state.past.length === 0) return state;
      const past = [...state.past];
      const prev = past.pop()!;
      return {
        ...state,
        cells: prev,
        past,
        future: [...state.future, cloneCells(state.cells)],
        status: checkSolved(prev, puzzle) ? 'solved' : 'in-progress',
        updatedAt: Date.now(),
      };
    }
    case 'redo': {
      if (state.future.length === 0) return state;
      const future = [...state.future];
      const nextCells = future.pop()!;
      return {
        ...state,
        cells: nextCells,
        past: [...state.past, cloneCells(state.cells)],
        future,
        status: checkSolved(nextCells, puzzle) ? 'solved' : 'in-progress',
        updatedAt: Date.now(),
      };
    }
    case 'tick':
      if (state.status === 'solved' || action.deltaMs <= 0) return state;
      return { ...state, elapsedMs: state.elapsedMs + action.deltaMs };
    default:
      return state;
  }
}
