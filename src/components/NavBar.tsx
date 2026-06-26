import { useGameStore } from '../state/gameStore.ts';
import { useUiStore } from '../state/uiStore.ts';
import { useTheme } from '../hooks/useTheme.ts';
import { BUILTIN_PUZZLES } from '../data/builtins.ts';
import { BrandMark, IconDice, IconMoon, IconSun } from './icons.tsx';
import styles from './NavBar.module.css';

export function NavBar() {
  const puzzle = useGameStore((s) => s.puzzle);
  const load = useGameStore((s) => s.load);
  const hideMistakes = useUiStore((s) => s.hideMistakes);
  const { theme, toggle } = useTheme();

  // Until the Phase 4 library lands, "New" cycles through the bundled puzzles.
  const newPuzzle = () => {
    const idx = BUILTIN_PUZZLES.findIndex((p) => p.id === puzzle?.id);
    const next = BUILTIN_PUZZLES[(idx + 1) % BUILTIN_PUZZLES.length];
    hideMistakes();
    load(next);
  };

  return (
    <header className={styles.nav}>
      <div className={styles.brand}>
        <BrandMark className={styles.brandMark} />
        <span className={styles.wordmark}>Sudoku</span>
      </div>

      <nav className={styles.actions} aria-label="Main">
        <button className={styles.btn} onClick={newPuzzle}>
          <IconDice className={styles.btnIcon} />
          <span className={styles.btnLabel}>New</span>
        </button>
        <button
          className={styles.iconBtn}
          onClick={toggle}
          title={theme === 'dark' ? 'Switch to light' : 'Switch to dark'}
          aria-label="Toggle theme"
        >
          {theme === 'dark' ? (
            <IconSun className={styles.btnIcon} />
          ) : (
            <IconMoon className={styles.btnIcon} />
          )}
        </button>
      </nav>
    </header>
  );
}
