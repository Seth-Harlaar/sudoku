import type { Puzzle } from '../game/types.ts';
import type { PuzzleSource } from './PuzzleSource.ts';

/**
 * STUB (Phase 6). Will fetch a puzzle index + per-puzzle files from a public git
 * repo (raw.githubusercontent / GitHub API) and cache them locally. Conforms to
 * PuzzleSource today so the library can adopt it later without UI changes.
 */
export function createRemoteGitSource(repoUrl: string): PuzzleSource {
  const notReady = (): never => {
    throw new Error('Remote git source is not implemented yet (Phase 6).');
  };
  return {
    id: `remote:${repoUrl}`,
    label: 'Remote repository',
    list(): Promise<Puzzle[]> {
      return notReady();
    },
    fetch(): Promise<Puzzle> {
      return notReady();
    },
  };
}
