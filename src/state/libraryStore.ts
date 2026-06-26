import { create } from 'zustand';
import type { Difficulty, GameStatus, Puzzle } from '../game/types.ts';
import { allCompletions, allProgress, allPuzzles, importPuzzles } from '../persistence/db.ts';
import { parseRadcliffeCsv } from '../sources/csv.ts';

export interface LibraryEntry {
  puzzle: Puzzle;
  status: GameStatus;
  /** Best (fastest) completion time in ms, if solved at least once. */
  bestMs?: number;
  /** Number of recorded completions. */
  plays: number;
}

export interface ImportReport {
  added: number;
  /** Rows whose puzzle already existed in the library. */
  duplicates: number;
  /** Rows that couldn't be parsed (header/malformed). */
  errors: number;
}

export type StatusFilter = 'all' | GameStatus;
export type DifficultyFilter = 'all' | Difficulty;

interface LibraryStore {
  loading: boolean;
  entries: LibraryEntry[];
  search: string;
  difficulty: DifficultyFilter;
  status: StatusFilter;
  lastImport: ImportReport | null;

  setSearch: (s: string) => void;
  setDifficulty: (d: DifficultyFilter) => void;
  setStatus: (s: StatusFilter) => void;
  refresh: () => Promise<void>;
  importText: (text: string) => Promise<ImportReport>;
}

async function buildEntries(): Promise<LibraryEntry[]> {
  const [puzzles, progress, completions] = await Promise.all([
    allPuzzles(),
    allProgress(),
    allCompletions(),
  ]);
  const progById = new Map(progress.map((p) => [p.puzzleId, p]));
  const compsById = new Map<string, number[]>();
  for (const c of completions) {
    const arr = compsById.get(c.puzzleId);
    if (arr) arr.push(c.elapsedMs);
    else compsById.set(c.puzzleId, [c.elapsedMs]);
  }

  const entries = puzzles.map((puzzle): LibraryEntry => {
    const times = compsById.get(puzzle.id) ?? [];
    const prog = progById.get(puzzle.id);
    const status: GameStatus =
      prog?.status === 'in-progress'
        ? 'in-progress'
        : times.length > 0 || prog?.status === 'solved'
          ? 'solved'
          : 'new';
    const entry: LibraryEntry = { puzzle, status, plays: times.length };
    if (times.length > 0) entry.bestMs = Math.min(...times);
    return entry;
  });

  // In-progress first, then by difficulty rating ascending, then title.
  const rank = { 'in-progress': 0, new: 1, solved: 2 } as const;
  entries.sort(
    (a, b) =>
      rank[a.status] - rank[b.status] ||
      (a.puzzle.rating ?? 99) - (b.puzzle.rating ?? 99) ||
      (a.puzzle.title ?? a.puzzle.id).localeCompare(b.puzzle.title ?? b.puzzle.id),
  );
  return entries;
}

export const useLibraryStore = create<LibraryStore>((set, get) => ({
  loading: false,
  entries: [],
  search: '',
  difficulty: 'all',
  status: 'all',
  lastImport: null,

  setSearch: (search) => set({ search }),
  setDifficulty: (difficulty) => set({ difficulty }),
  setStatus: (status) => set({ status }),

  refresh: async () => {
    set({ loading: true });
    const entries = await buildEntries();
    set({ entries, loading: false });
  },

  importText: async (text) => {
    const { puzzles, skipped } = parseRadcliffeCsv(text);
    const { added, skipped: duplicates } = await importPuzzles(puzzles);
    const report: ImportReport = { added, duplicates, errors: skipped };
    set({ lastImport: report });
    await get().refresh();
    return report;
  },
}));

/** Apply the active filters/search to the entries (pure view helper). */
export function filterEntries(
  entries: readonly LibraryEntry[],
  search: string,
  difficulty: DifficultyFilter,
  status: StatusFilter,
): LibraryEntry[] {
  const q = search.trim().toLowerCase();
  return entries.filter((e) => {
    if (difficulty !== 'all' && e.puzzle.difficulty !== difficulty) return false;
    if (status !== 'all' && e.status !== status) return false;
    if (q) {
      const hay = `${e.puzzle.title ?? ''} ${e.puzzle.id} ${e.puzzle.author ?? ''}`;
      if (!hay.toLowerCase().includes(q)) return false;
    }
    return true;
  });
}
