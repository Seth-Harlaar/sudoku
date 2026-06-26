import type { Puzzle } from '../types.ts';

const givenRows = [
  '53..7....',
  '6..195...',
  '.98....6.',
  '8...6...3',
  '4..8.3..1',
  '7...2...6',
  '.6....28.',
  '...419..5',
  '....8..79',
];

const solutionRows = [
  '534678912',
  '672195348',
  '198342567',
  '859761423',
  '426853791',
  '713924856',
  '961537284',
  '287419635',
  '345286179',
];

export const GIVENS = givenRows.join('');
export const SOLUTION = solutionRows.join('');

export const CLASSIC: Puzzle = {
  id: 'classic',
  givens: GIVENS,
  solution: SOLUTION,
  source: 'builtin',
  addedAt: 0,
};
