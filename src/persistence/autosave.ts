/**
 * Debounced progress autosave. Coalesces rapid edits into one IndexedDB write, and
 * exposes `flushSave` so the host can force a final write on tab hide / unload.
 */

import type { GameState } from '../game/types.ts';
import { saveProgress } from './db.ts';

const DEBOUNCE_MS = 500;

let timer: number | null = null;
let pending: GameState | null = null;

function write(): void {
  timer = null;
  const game = pending;
  pending = null;
  if (game) void saveProgress(game);
}

/** Queue a debounced save of the latest game state. */
export function scheduleSave(game: GameState): void {
  pending = game;
  if (timer == null) timer = window.setTimeout(write, DEBOUNCE_MS);
}

/** Force any pending save to flush immediately (e.g. on pagehide). */
export function flushSave(): void {
  if (timer != null) {
    window.clearTimeout(timer);
    timer = null;
  }
  if (pending) {
    void saveProgress(pending);
    pending = null;
  }
}

/** Register flush handlers so progress survives a tab close / backgrounding. */
export function installAutosaveFlush(): void {
  window.addEventListener('pagehide', flushSave);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flushSave();
  });
}
