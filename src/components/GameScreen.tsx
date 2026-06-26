import { useEffect } from 'react';
import { useGameStore } from '../state/gameStore.ts';
import { useKeyboard } from '../hooks/useKeyboard.ts';
import { useGameTimer } from '../hooks/useGameTimer.ts';
import { BUILTIN_PUZZLES } from '../data/builtins.ts';
import { Board } from './Board/Board.tsx';
import { Controls } from './Controls/Controls.tsx';
import { Timer, formatTime } from './Timer.tsx';
import styles from './GameScreen.module.css';

export function GameScreen() {
  const game = useGameStore((s) => s.game);
  const puzzle = useGameStore((s) => s.puzzle);
  const load = useGameStore((s) => s.load);
  const dispatch = useGameStore((s) => s.dispatch);

  useKeyboard();
  useGameTimer();

  // Phase 2: boot straight into the first bundled puzzle (library lands in Phase 4).
  useEffect(() => {
    if (!game) load(BUILTIN_PUZZLES[0]);
  }, [game, load]);

  if (!game || !puzzle) return null;
  const solved = game.status === 'solved';

  return (
    <div className={styles.screen}>
      <header className={styles.bar}>
        <div className={styles.meta}>
          <span className={styles.puzzleTitle}>{puzzle.title ?? 'Sudoku'}</span>
          {puzzle.difficulty && (
            <span className={styles.badge}>{puzzle.difficulty}</span>
          )}
        </div>
        <Timer />
      </header>

      <div className={styles.layout}>
        <div className={styles.boardWrap}>
          <div className={styles.boardSizer}>
            <Board />
          </div>
          {solved && (
            <div className={styles.win} role="alertdialog" aria-label="Puzzle solved">
              <div className={styles.winCard}>
                <h2 className={styles.winTitle}>Solved!</h2>
                <p className={styles.winTime}>{formatTime(game.elapsedMs)}</p>
                <button
                  className={styles.winBtn}
                  onClick={() => dispatch({ type: 'restart' })}
                >
                  Play again
                </button>
              </div>
            </div>
          )}
        </div>

        <div className={styles.controlsSlot}>
          <Controls />
        </div>
      </div>
    </div>
  );
}
