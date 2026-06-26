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

  if (mode === 'color') {
    const colorIdx = digit - 1; // palette index 0-8
    const allSame = editable.every((i) => state.cells[i].color === colorIdx);
    for (const i of editable) next[i].color = allSame ? null : colorIdx;
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

/** Clear value, marks, and color from editable selected cells. */
function applyClear(state: GameState): Cell[] {
  const editable = state.selection.filter((i) => !state.cells[i].given);
  if (editable.length === 0) return state.cells;
  const anything = editable.some(
    (i) =>
      state.cells[i].value != null ||
      state.cells[i].center.length > 0 ||
      state.cells[i].corner.length > 0 ||
      state.cells[i].color != null,
  );
  if (!anything) return state.cells;
  const next = cloneCells(state.cells);
  for (const i of editable) {
    next[i].value = null;
    next[i].center = [];
    next[i].corner = [];
    next[i].color = null;
  }
  return next;
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
