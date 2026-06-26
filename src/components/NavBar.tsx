import { useGameStore } from '../state/gameStore.ts';
import { useUiStore } from '../state/uiStore.ts';
import { useViewStore } from '../state/viewStore.ts';
import { useTheme } from '../hooks/useTheme.ts';
import { BUILTIN_PUZZLES } from '../data/builtins.ts';
import { BrandMark, IconDice, IconLibrary, IconMoon, IconSun } from './icons.tsx';
import styles from './NavBar.module.css';

export function NavBar() {
  const puzzle = useGameStore((s) => s.puzzle);
  const open = useGameStore((s) => s.open);
  const hideMistakes = useUiStore((s) => s.hideMistakes);
  const page = useViewStore((s) => s.page);
  const go = useViewStore((s) => s.go);
  const { theme, toggle } = useTheme();

  // "New" cycles through the bundled puzzles (resuming each one's saved progress).
  const newPuzzle = () => {
    const idx = BUILTIN_PUZZLES.findIndex((p) => p.id === puzzle?.id);
    const next = BUILTIN_PUZZLES[(idx + 1) % BUILTIN_PUZZLES.length];
    hideMistakes();
    void open(next);
    go('game');
  };

  return (
    <header className={styles.nav}>
      <div className={styles.left}>
        <button
          className={styles.brand}
          onClick={() => go('game')}
          aria-label="Sudoku home"
        >
          <BrandMark className={styles.brandMark} />
        </button>

        <nav className={styles.tabs} aria-label="Main">
          <button
            className={`${styles.tab} ${page === 'library' ? styles.tabActive : ''}`}
            aria-current={page === 'library'}
            onClick={() => go('library')}
          >
            <IconLibrary className={styles.tabIcon} />
            Library
          </button>
          <button
            className={`${styles.tab} ${page === 'game' ? styles.tabActive : ''}`}
            aria-current={page === 'game'}
            onClick={() => go('game')}
          >
            Sudoku
          </button>
        </nav>
      </div>

      <div className={styles.actions}>
        <button
          className={styles.iconBtn}
          onClick={newPuzzle}
          title="New puzzle"
          aria-label="New puzzle"
        >
          <IconDice className={styles.tabIcon} />
        </button>
        <button
          className={styles.iconBtn}
          onClick={toggle}
          title={theme === 'dark' ? 'Switch to light' : 'Switch to dark'}
          aria-label="Toggle theme"
        >
          {theme === 'dark' ? (
            <IconSun className={styles.tabIcon} />
          ) : (
            <IconMoon className={styles.tabIcon} />
          )}
        </button>
      </div>
    </header>
  );
}
