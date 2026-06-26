/**
 * App startup: make storage durable, seed the bundled puzzles, install the autosave
 * flush, and open the last-played puzzle (resuming its saved progress) or the first
 * builtin on a fresh install.
 */

import { BUILTIN_PUZZLES } from '../data/builtins.ts';
import { getPuzzle, getSetting, putPuzzleIfAbsent } from '../persistence/db.ts';
import { installAutosaveFlush } from '../persistence/autosave.ts';
import { requestPersistentStorage } from '../persistence/durable.ts';
import { useGameStore } from '../state/gameStore.ts';

let started = false;

export async function initApp(): Promise<void> {
  if (started) return; // guard against React StrictMode double-invoke
  started = true;

  installAutosaveFlush();
  void requestPersistentStorage();

  // Seed bundled puzzles (no-op if already present, so progress is never clobbered).
  await Promise.all(BUILTIN_PUZZLES.map(putPuzzleIfAbsent));

  // Resume the last-played puzzle if it still exists, else the first builtin.
  const lastId = await getSetting<string>('lastPlayed');
  const puzzle = (lastId ? await getPuzzle(lastId) : undefined) ?? BUILTIN_PUZZLES[0];
  await useGameStore.getState().open(puzzle);
}
