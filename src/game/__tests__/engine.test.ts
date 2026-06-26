import { beforeEach, describe, expect, it } from 'vitest';
import type { Action, GameState } from '../types.ts';
import { apply, createGame } from '../engine.ts';
import { parseBoard } from '../grid.ts';
import { CLASSIC, SOLUTION } from './fixtures.ts';

/** Apply a sequence of actions, threading the classic puzzle as context. */
function run(state: GameState, ...actions: Action[]): GameState {
  return actions.reduce((s, a) => apply(s, a, CLASSIC), state);
}

describe('createGame', () => {
  it('marks givens immutable and leaves blanks empty', () => {
    const g = createGame(CLASSIC);
    expect(g.cells).toHaveLength(81);
    expect(g.cells[0]).toMatchObject({ value: 5, given: true });
    expect(g.cells[2]).toMatchObject({ value: null, given: false });
    expect(g.status).toBe('new');
    expect(g.past).toEqual([]);
  });
});

describe('selection', () => {
  let g: GameState;
  beforeEach(() => {
    g = createGame(CLASSIC);
  });

  it('replaces selection by default and extends when additive', () => {
    g = run(g, { type: 'select', cells: [2] });
    expect(g.selection).toEqual([2]);
    g = run(g, { type: 'select', cells: [3], additive: true });
    expect(g.selection).toEqual([2, 3]);
    g = run(g, { type: 'select', cells: [5] });
    expect(g.selection).toEqual([5]);
  });

  it('moves with arrow deltas and clamps at edges', () => {
    g = run(g, { type: 'select', cells: [0] }, { type: 'move', dRow: 0, dCol: -1 });
    expect(g.selection).toEqual([0]); // clamped at left edge
    g = run(g, { type: 'move', dRow: 1, dCol: 1 });
    expect(g.selection).toEqual([10]); // (1,1)
  });
});

describe('normal mode input', () => {
  it('places a digit only in editable cells and toggles off on repeat', () => {
    let g = createGame(CLASSIC);
    g = run(g, { type: 'select', cells: [2] }, { type: 'input', digit: 4 });
    expect(g.cells[2].value).toBe(4);
    expect(g.status).toBe('in-progress');
    // Repeat same digit clears it (toggle).
    g = run(g, { type: 'input', digit: 4 });
    expect(g.cells[2].value).toBeNull();
  });

  it('never mutates a given cell', () => {
    let g = createGame(CLASSIC);
    g = run(g, { type: 'select', cells: [0] }, { type: 'input', digit: 9 });
    expect(g.cells[0].value).toBe(5); // unchanged
    expect(g.past).toEqual([]); // no-op did not push history
  });

  it('placing a value clears existing pencil marks in that cell', () => {
    let g = createGame(CLASSIC);
    g = run(
      g,
      { type: 'select', cells: [2] },
      { type: 'setMode', mode: 'center' },
      { type: 'input', digit: 1 },
      { type: 'input', digit: 2 },
      { type: 'setMode', mode: 'normal' },
      { type: 'input', digit: 4 },
    );
    expect(g.cells[2].value).toBe(4);
    expect(g.cells[2].center).toEqual([]);
  });
});

describe('pencil marks', () => {
  it('center marks add across selection, stay sorted, and toggle off', () => {
    let g = createGame(CLASSIC);
    g = run(
      g,
      { type: 'select', cells: [2, 3] },
      { type: 'setMode', mode: 'center' },
      { type: 'input', digit: 5 },
      { type: 'input', digit: 1 },
    );
    expect(g.cells[2].center).toEqual([1, 5]);
    expect(g.cells[3].center).toEqual([1, 5]);
    // Both already have 1 -> toggles off for all.
    g = run(g, { type: 'input', digit: 1 });
    expect(g.cells[2].center).toEqual([5]);
    expect(g.cells[3].center).toEqual([5]);
  });

  it('adds the mark to all when only some cells have it', () => {
    let g = createGame(CLASSIC);
    g = run(
      g,
      { type: 'select', cells: [2] },
      { type: 'setMode', mode: 'corner' },
      { type: 'input', digit: 7 },
      { type: 'select', cells: [2, 3] },
      { type: 'input', digit: 7 },
    );
    // cell 2 had 7, cell 3 did not -> both end up with 7.
    expect(g.cells[2].corner).toEqual([7]);
    expect(g.cells[3].corner).toEqual([7]);
  });
});

describe('input mode override', () => {
  it('applies a digit in the overridden mode without changing the sticky mode', () => {
    let g = createGame(CLASSIC);
    g = run(
      g,
      { type: 'select', cells: [2] },
      { type: 'input', digit: 3, mode: 'corner' },
    );
    expect(g.mode).toBe('normal'); // sticky mode unchanged
    expect(g.cells[2].corner).toEqual([3]);
    expect(g.cells[2].value).toBeNull();
  });
});

describe('color mode', () => {
  it('applies and toggles a color across the selection', () => {
    let g = createGame(CLASSIC);
    g = run(
      g,
      { type: 'select', cells: [2, 3] },
      { type: 'setMode', mode: 'color' },
      { type: 'input', digit: 4 },
    );
    expect(g.cells[2].color).toBe(3);
    expect(g.cells[3].color).toBe(3);
    g = run(g, { type: 'input', digit: 4 });
    expect(g.cells[2].color).toBeNull();
  });
});

describe('clear', () => {
  it('clears value, marks, and color of editable cells but not givens', () => {
    let g = createGame(CLASSIC);
    g = run(
      g,
      { type: 'select', cells: [2] },
      { type: 'input', digit: 4 },
      { type: 'clear' },
    );
    expect(g.cells[2].value).toBeNull();
    // Clearing a given is a no-op.
    const before = g.past.length;
    g = run(g, { type: 'select', cells: [0] }, { type: 'clear' });
    expect(g.cells[0].value).toBe(5);
    expect(g.past.length).toBe(before);
  });
});

describe('undo / redo', () => {
  it('reverts and reapplies the last change', () => {
    let g = createGame(CLASSIC);
    g = run(g, { type: 'select', cells: [2] }, { type: 'input', digit: 4 });
    expect(g.cells[2].value).toBe(4);
    g = run(g, { type: 'undo' });
    expect(g.cells[2].value).toBeNull();
    g = run(g, { type: 'redo' });
    expect(g.cells[2].value).toBe(4);
  });

  it('a new change after undo clears the redo stack', () => {
    let g = createGame(CLASSIC);
    g = run(
      g,
      { type: 'select', cells: [2] },
      { type: 'input', digit: 4 },
      { type: 'undo' },
      { type: 'input', digit: 6 },
    );
    expect(g.future).toEqual([]);
    g = run(g, { type: 'redo' });
    expect(g.cells[2].value).toBe(6); // redo was a no-op
  });

  it('undo/redo on empty stacks are no-ops', () => {
    const g = createGame(CLASSIC);
    expect(run(g, { type: 'undo' })).toBe(g);
    expect(run(g, { type: 'redo' })).toBe(g);
  });
});

describe('restart', () => {
  it('clears all entries back to givens', () => {
    let g = createGame(CLASSIC);
    g = run(g, { type: 'select', cells: [2] }, { type: 'input', digit: 4 });
    g = run(g, { type: 'restart' });
    expect(g.cells[2].value).toBeNull();
    expect(g.cells[0].value).toBe(5);
    expect(g.past).toEqual([]);
    expect(g.status).toBe('new');
  });
});

describe('solved detection', () => {
  it('marks solved when the board matches the solution', () => {
    let g = createGame(CLASSIC);
    const sol = parseBoard(SOLUTION);
    // Fill every non-given cell with the solution digit.
    for (let i = 0; i < 81; i++) {
      if (g.cells[i].given) continue;
      g = run(g, { type: 'select', cells: [i] }, { type: 'input', digit: sol[i] });
    }
    expect(g.status).toBe('solved');
    // Timer stops advancing once solved.
    const t = run(g, { type: 'tick', deltaMs: 1000 });
    expect(t.elapsedMs).toBe(g.elapsedMs);
  });
});

describe('timer', () => {
  it('accumulates positive deltas while playing', () => {
    let g = createGame(CLASSIC);
    g = run(g, { type: 'tick', deltaMs: 500 }, { type: 'tick', deltaMs: 250 });
    expect(g.elapsedMs).toBe(750);
    expect(run(g, { type: 'tick', deltaMs: -5 }).elapsedMs).toBe(750);
  });
});
