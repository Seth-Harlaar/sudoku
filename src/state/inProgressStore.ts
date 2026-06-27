import { create } from 'zustand';
import type { Puzzle } from '../game/types.ts';
import { allProgress, allPuzzles } from '../persistence/db.ts';

export interface InProgressEntry {
  puzzle: Puzzle;
  elapsedMs: number;
  updatedAt: number;
  /** Cells filled out of the cells that started empty (0..1). */
  progress: number;
}

interface InProgressStore {
  loading: boolean;
  entries: InProgressEntry[];
  load: () => Promise<void>;
}

export const useInProgressStore = create<InProgressStore>((set) => ({
  loading: false,
  entries: [],

  load: async () => {
    set({ loading: true });
    const [progress, puzzles] = await Promise.all([allProgress(), allPuzzles()]);
    const byId = new Map(puzzles.map((p) => [p.id, p]));

    const entries: InProgressEntry[] = [];
    for (const g of progress) {
      if (g.status !== 'in-progress') continue; // only active, not solved
      const puzzle = byId.get(g.puzzleId);
      if (!puzzle) continue; // definition missing (shouldn't happen post-open)

      const empty = puzzle.givens.replace(/[^.]/g, '').length; // count of '.' blanks
      const placed = g.cells.filter((c, i) => puzzle.givens[i] === '.' && c.value != null)
        .length;
      entries.push({
        puzzle,
        elapsedMs: g.elapsedMs,
        updatedAt: g.updatedAt,
        progress: empty ? placed / empty : 0,
      });
    }
    // Most recently played first.
    entries.sort((a, b) => b.updatedAt - a.updatedAt);
    set({ entries, loading: false });
  },
}));
