import { create } from 'zustand';
import type { Action, GameState, Puzzle } from '../game/types.ts';
import { apply, createGame } from '../game/engine.ts';
import { addCompletion, loadProgress, setSetting } from '../persistence/db.ts';
import { scheduleSave } from '../persistence/autosave.ts';

const LAST_PLAYED_KEY = 'lastPlayed';

interface GameStore {
  puzzle: Puzzle | null;
  game: GameState | null;
  /** Open a puzzle, resuming saved progress from IndexedDB if present. */
  open: (puzzle: Puzzle) => Promise<void>;
  /** Dispatch an engine action; autosaves and records completions as a side effect. */
  dispatch: (action: Action) => void;
}

export const useGameStore = create<GameStore>((set, get) => ({
  puzzle: null,
  game: null,

  open: async (puzzle) => {
    const saved = await loadProgress(puzzle.id);
    set({ puzzle, game: saved ?? createGame(puzzle) });
    void setSetting(LAST_PLAYED_KEY, puzzle.id);
  },

  dispatch: (action) => {
    const { game, puzzle } = get();
    if (!game || !puzzle) return;
    const next = apply(game, action, puzzle);
    if (next === game) return;
    set({ game: next });

    // Record a completion the moment the puzzle becomes solved (append-only).
    if (next.status === 'solved' && game.status !== 'solved') {
      void addCompletion({
        id: crypto.randomUUID(),
        puzzleId: puzzle.id,
        elapsedMs: next.elapsedMs,
        completedAt: Date.now(),
      });
    }

    scheduleSave(next);
  },
}));
