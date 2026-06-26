import type { Puzzle } from '../game/types.ts';

/**
 * A source of puzzles the library can pull from. Local file import writes straight
 * to IndexedDB, but remote sources (a public git repo, Phase 6) conform to this
 * interface so the library/UI stays source-agnostic.
 */
export interface PuzzleSource {
  readonly id: string;
  readonly label: string;
  /** List available puzzles (metadata may be partial until fetched). */
  list(): Promise<Puzzle[]>;
  /** Fetch the full definition for one puzzle. */
  fetch(id: string): Promise<Puzzle>;
}
