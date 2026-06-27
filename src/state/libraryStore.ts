import { create } from 'zustand';
import type { Difficulty, GameStatus, Puzzle } from '../game/types.ts';
import {
  allCompletions,
  allProgress,
  allPuzzles,
  getPuzzle,
  importPuzzles,
} from '../persistence/db.ts';
import { parseRadcliffeCsv } from '../sources/csv.ts';
import { getCatalogPuzzle, loadCatalog } from '../sources/puzzleCatalog.ts';

/**
 * A single row in the library list. For base-set puzzles this is the light catalog
 * meta only (no board) — the full `Puzzle` is fetched lazily when opened. Puzzles
 * imported by the user (or built-ins) live in IndexedDB and resolve from there.
 */
export interface LibraryItem {
  id: string;
  clues?: number;
  rating?: number;
  difficulty?: Difficulty;
  title?: string;
  source: 'catalog' | 'idb';
  /** Global catalog index (present only when `source === 'catalog'`). */
  catalogIndex?: number;
}

export interface LibraryStatus {
  status: GameStatus;
  /** Best (fastest) completion time in ms, if solved at least once. */
  bestMs?: number;
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
  /** All list rows: user/built-in puzzles first, then the base-set catalog. */
  items: LibraryItem[];
  /** Play status keyed by puzzle id (only ids the user has touched appear). */
  statusById: Map<string, LibraryStatus>;
  search: string;
  difficulty: DifficultyFilter;
  status: StatusFilter;
  lastImport: ImportReport | null;

  setSearch: (s: string) => void;
  setDifficulty: (d: DifficultyFilter) => void;
  setStatus: (s: StatusFilter) => void;
  load: () => Promise<void>;
  importText: (text: string) => Promise<ImportReport>;
  /** Resolve a list row to a full, playable Puzzle (lazy-loads catalog boards). */
  resolve: (item: LibraryItem) => Promise<Puzzle>;
}

/** Build the play-status map from saved progress + completion history. */
async function buildStatus(): Promise<Map<string, LibraryStatus>> {
  const [progress, completions] = await Promise.all([allProgress(), allCompletions()]);
  const byId = new Map<string, LibraryStatus>();

  for (const c of completions) {
    const cur = byId.get(c.puzzleId);
    if (cur) {
      cur.plays += 1;
      cur.bestMs = Math.min(cur.bestMs ?? Infinity, c.elapsedMs);
    } else {
      byId.set(c.puzzleId, { status: 'solved', plays: 1, bestMs: c.elapsedMs });
    }
  }
  for (const p of progress) {
    const cur = byId.get(p.puzzleId);
    if (p.status === 'in-progress') {
      if (cur) cur.status = 'in-progress';
      else byId.set(p.puzzleId, { status: 'in-progress', plays: 0 });
    } else if (p.status === 'solved' && !cur) {
      byId.set(p.puzzleId, { status: 'solved', plays: 0 });
    }
  }
  return byId;
}

async function buildItems(): Promise<LibraryItem[]> {
  const [catalog, idbPuzzles] = await Promise.all([
    loadCatalog().catch(() => []),
    allPuzzles(),
  ]);
  const catalogIds = new Set(catalog.map((c) => c.id));

  // Built-ins / user imports that aren't part of the base-set catalog.
  const extras: LibraryItem[] = idbPuzzles
    .filter((p) => !catalogIds.has(p.id))
    .map((p) => ({
      id: p.id,
      source: 'idb' as const,
      ...(p.clues != null ? { clues: p.clues } : {}),
      ...(p.rating != null ? { rating: p.rating } : {}),
      ...(p.difficulty ? { difficulty: p.difficulty } : {}),
      ...(p.title ? { title: p.title } : {}),
    }));

  const base: LibraryItem[] = catalog.map((c) => ({
    id: c.id,
    clues: c.clues,
    rating: c.rating,
    source: 'catalog' as const,
    catalogIndex: c.index,
    ...(c.difficulty ? { difficulty: c.difficulty } : {}),
  }));

  return [...extras, ...base];
}

export const useLibraryStore = create<LibraryStore>((set, get) => ({
  loading: false,
  items: [],
  statusById: new Map(),
  search: '',
  difficulty: 'all',
  status: 'all',
  lastImport: null,

  setSearch: (search) => set({ search }),
  setDifficulty: (difficulty) => set({ difficulty }),
  setStatus: (status) => set({ status }),

  load: async () => {
    set({ loading: true });
    // Items rarely change; statuses change every game. Rebuild both on load —
    // it's cheap (the catalog is a one-time fetch, the rest are small IDB reads).
    const [items, statusById] = await Promise.all([
      get().items.length ? Promise.resolve(get().items) : buildItems(),
      buildStatus(),
    ]);
    set({ items, statusById, loading: false });
  },

  importText: async (text) => {
    const { puzzles, skipped } = parseRadcliffeCsv(text);
    const { added, skipped: duplicates } = await importPuzzles(puzzles);
    const report: ImportReport = { added, duplicates, errors: skipped };
    set({ lastImport: report, items: [] }); // force item rebuild to include imports
    await get().load();
    set({ lastImport: report });
    return report;
  },

  resolve: async (item) => {
    if (item.source === 'catalog' && item.catalogIndex != null) {
      return getCatalogPuzzle(item.catalogIndex);
    }
    const puzzle = await getPuzzle(item.id);
    if (!puzzle) throw new Error(`puzzle ${item.id} not found`);
    return puzzle;
  },
}));

/** Resolve an item's effective play status (defaults to 'new'). */
export function statusOf(
  statusById: Map<string, LibraryStatus>,
  id: string,
): LibraryStatus {
  return statusById.get(id) ?? { status: 'new', plays: 0 };
}

/** Apply the active filters/search to the items (pure view helper). */
export function filterItems(
  items: readonly LibraryItem[],
  statusById: Map<string, LibraryStatus>,
  search: string,
  difficulty: DifficultyFilter,
  status: StatusFilter,
): LibraryItem[] {
  const q = search.trim().toLowerCase();
  return items.filter((item) => {
    if (difficulty !== 'all' && item.difficulty !== difficulty) return false;
    if (status !== 'all' && statusOf(statusById, item.id).status !== status) return false;
    if (q) {
      const hay = `${item.title ?? ''} ${item.id}`;
      if (!hay.toLowerCase().includes(q)) return false;
    }
    return true;
  });
}
