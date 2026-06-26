import { create } from 'zustand';
import type { Action, GameState, Puzzle } from '../game/types.ts';
import { apply, createGame } from '../game/engine.ts';

interface GameStore {
  puzzle: Puzzle | null;
  game: GameState | null;
  /** Load a puzzle, optionally resuming a saved game state. */
  load: (puzzle: Puzzle, saved?: GameState) => void;
  /** Dispatch an engine action against the current game. */
  dispatch: (action: Action) => void;
}

export const useGameStore = create<GameStore>((set, get) => ({
  puzzle: null,
  game: null,

  load: (puzzle, saved) =>
    set({ puzzle, game: saved ?? createGame(puzzle) }),

  dispatch: (action) => {
    const { game, puzzle } = get();
    if (!game) return;
    const next = apply(game, action, puzzle ?? undefined);
    if (next !== game) set({ game: next });
  },
}));
