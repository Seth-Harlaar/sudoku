/**
 * IndexedDB persistence (via `idb`). Four stores:
 *  - `puzzles`     immutable puzzle definitions, keyed by id
 *  - `progress`    in-progress GameState, keyed by puzzleId (one per puzzle)
 *  - `completions` append-only finished-game history, keyed by id, indexed by puzzleId
 *  - `settings`    small key/value app state (e.g. last-played puzzle)
 *
 * The library index (Phase 4) and stats (Phase 5) are derived from these stores.
 */

import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { Completion, GameState, Puzzle } from '../game/types.ts';

interface SettingRow {
  key: string;
  value: unknown;
}

interface SudokuDB extends DBSchema {
  puzzles: { key: string; value: Puzzle };
  progress: { key: string; value: GameState };
  completions: { key: string; value: Completion; indexes: { byPuzzle: string } };
  settings: { key: string; value: SettingRow };
}

const DB_NAME = 'sudoku';
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<SudokuDB>> | null = null;

export function getDB(): Promise<IDBPDatabase<SudokuDB>> {
  if (!dbPromise) {
    dbPromise = openDB<SudokuDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        db.createObjectStore('puzzles', { keyPath: 'id' });
        db.createObjectStore('progress', { keyPath: 'puzzleId' });
        const completions = db.createObjectStore('completions', { keyPath: 'id' });
        completions.createIndex('byPuzzle', 'puzzleId');
        db.createObjectStore('settings', { keyPath: 'key' });
      },
    });
  }
  return dbPromise;
}

// ---- Puzzles -------------------------------------------------------------

export async function putPuzzle(puzzle: Puzzle): Promise<void> {
  await (await getDB()).put('puzzles', puzzle);
}

/** Insert a puzzle only if it isn't already stored (used to seed builtins). */
export async function putPuzzleIfAbsent(puzzle: Puzzle): Promise<void> {
  const db = await getDB();
  if (!(await db.get('puzzles', puzzle.id))) await db.put('puzzles', puzzle);
}

export async function getPuzzle(id: string): Promise<Puzzle | undefined> {
  return (await getDB()).get('puzzles', id);
}

export async function allPuzzles(): Promise<Puzzle[]> {
  return (await getDB()).getAll('puzzles');
}

/** Bulk-insert puzzles, skipping ids that already exist. Returns counts. */
export async function importPuzzles(
  puzzles: readonly Puzzle[],
): Promise<{ added: number; skipped: number }> {
  const db = await getDB();
  const tx = db.transaction('puzzles', 'readwrite');
  const store = tx.objectStore('puzzles');
  let added = 0;
  let skipped = 0;
  for (const p of puzzles) {
    if (await store.get(p.id)) {
      skipped++;
    } else {
      await store.put(p);
      added++;
    }
  }
  await tx.done;
  return { added, skipped };
}

// ---- Progress ------------------------------------------------------------

export async function saveProgress(game: GameState): Promise<void> {
  await (await getDB()).put('progress', game);
}

export async function loadProgress(puzzleId: string): Promise<GameState | undefined> {
  return (await getDB()).get('progress', puzzleId);
}

export async function allProgress(): Promise<GameState[]> {
  return (await getDB()).getAll('progress');
}

export async function deleteProgress(puzzleId: string): Promise<void> {
  await (await getDB()).delete('progress', puzzleId);
}

// ---- Completions ---------------------------------------------------------

export async function addCompletion(completion: Completion): Promise<void> {
  await (await getDB()).add('completions', completion);
}

export async function completionsFor(puzzleId: string): Promise<Completion[]> {
  return (await getDB()).getAllFromIndex('completions', 'byPuzzle', puzzleId);
}

export async function allCompletions(): Promise<Completion[]> {
  return (await getDB()).getAll('completions');
}

// ---- Settings ------------------------------------------------------------

export async function getSetting<T>(key: string): Promise<T | undefined> {
  const row = await (await getDB()).get('settings', key);
  return row?.value as T | undefined;
}

export async function setSetting(key: string, value: unknown): Promise<void> {
  await (await getDB()).put('settings', { key, value });
}
