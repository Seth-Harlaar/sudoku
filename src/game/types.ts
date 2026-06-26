/** Input mode, mirroring SudokuPad's four modes. */
export type Mode = 'normal' | 'corner' | 'center' | 'color';

/** Difficulty buckets derived from the dataset's numeric rating. */
export type Difficulty = 'easy' | 'medium' | 'hard' | 'expert';

/** Immutable puzzle definition. `givens`/`solution` are 81-char row-major strings. */
export interface Puzzle {
  /** Stable id, derived from a hash of `givens` (auto-dedupes on re-import). */
  id: string;
  title?: string;
  author?: string;
  /** 81 chars, '.' or '0' = empty. */
  givens: string;
  /** 81 digits 1-9, optional. Enables exact checking. */
  solution?: string;
  /** Number of givens (from dataset). */
  clues?: number;
  /** Raw numeric difficulty rating (from dataset). */
  rating?: number;
  /** Bucketed difficulty for filtering. */
  difficulty?: Difficulty;
  source: 'local' | 'remote' | 'builtin';
  addedAt: number;
}

/** Per-cell play state. */
export interface Cell {
  /** Placed digit 1-9, or null. */
  value: number | null;
  /** True for clue cells; immutable during play. */
  given: boolean;
  /** Center pencil marks, kept sorted & unique. */
  center: number[];
  /** Corner pencil marks, kept sorted & unique. */
  corner: number[];
  /** Highlight color palette index 0-8, or null. */
  color: number | null;
}

export type GameStatus = 'new' | 'in-progress' | 'solved';

/** Full, serializable state of an in-progress (or finished) game. */
export interface GameState {
  puzzleId: string;
  cells: Cell[]; // length 81
  selection: number[]; // selected cell indices
  mode: Mode;
  /** Accumulated play time in ms (excludes paused time). */
  elapsedMs: number;
  status: GameStatus;
  updatedAt: number;
  /** Undo stack: prior `cells` snapshots, oldest first, bounded by MAX_HISTORY. */
  past: Cell[][];
  /** Redo stack: undone `cells` snapshots, most-recently-undone last. */
  future: Cell[][];
}

/** One finished-game record (append-only history). FK to Puzzle, never a copy. */
export interface Completion {
  id: string;
  puzzleId: string;
  elapsedMs: number;
  completedAt: number;
}

/**
 * All mutations to a GameState go through these actions so the engine stays a pure
 * reducer and undo/redo is just history replay. `digit` is 1-9; modes that take a
 * digit toggle it (add if absent, remove if present) across the selection.
 */
export type Action =
  | { type: 'select'; cells: number[]; additive?: boolean }
  | { type: 'selectAll' }
  | { type: 'clearSelection' }
  | { type: 'move'; dRow: number; dCol: number; extend?: boolean }
  | { type: 'setMode'; mode: Mode }
  // applies a digit in `mode` (or the current mode) to the selection
  | { type: 'input'; digit: number; mode?: Mode }
  | { type: 'clear' } // clear value/marks/color of the selection
  | { type: 'restart' } // reset board to givens
  | { type: 'undo' }
  | { type: 'redo' }
  | { type: 'tick'; deltaMs: number }; // advance the timer
