import type { Puzzle } from '../game/types.ts';
import { bucketDifficulty, makePuzzleId } from '../game/puzzle.ts';

interface BuiltinSpec {
  title: string;
  givens: string;
  solution: string;
  rating: number;
}

/**
 * A handful of bundled puzzles so the app is useful on first launch (before any
 * import). These follow the same shape as imported Radcliffe rows.
 */
const SPECS: BuiltinSpec[] = [
  {
    title: 'Warm-up',
    givens:
      '53..7....6..195....98....6.8...6...34..8.3..17...2...6.6....28....419..5....8..79',
    solution:
      '534678912672195348198342567859761423426853791713924856961537284287419635345286179',
    rating: 1.5,
  },
  {
    title: 'Afternoon',
    givens:
      '....2.39....7638...8.....64..9.8.4....74.91....8.5.2..54.....8...3176....26.4....',
    solution:
      '675824391914763825382915764159287436267439158438651279541392687893176542726548913',
    rating: 3.2,
  },
];

export const BUILTIN_PUZZLES: Puzzle[] = SPECS.map((s) => {
  const difficulty = bucketDifficulty(s.rating);
  return {
    id: makePuzzleId(s.givens),
    title: s.title,
    givens: s.givens,
    solution: s.solution,
    clues: s.givens.replace(/[.0]/g, '').length,
    rating: s.rating,
    ...(difficulty ? { difficulty } : {}),
    source: 'builtin',
    addedAt: 0,
  };
});
